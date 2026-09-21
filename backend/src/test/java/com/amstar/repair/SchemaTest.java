package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.support.IntegrationTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * The schema guard.
 *
 * <p>Simply reaching these assertions means Flyway applied every migration to an empty database and
 * Hibernate then validated the entities against the result. A migration with a syntax error, a
 * migration that only works on a database that already has data, or an entity field with no column
 * behind it all fail the build here.
 */
public class SchemaTest extends IntegrationTest {

  @Autowired private JdbcTemplate jdbc;

  @Test
  void everyMigrationFileActuallyRan() throws Exception {
    List<String> onDisk = migrationFileNames();
    List<String> applied =
        jdbc.queryForList(
            "select version from flyway_schema_history where version is not null"
                + " order by version::int",
            String.class);

    // A file Flyway skipped is invisible in production until the feature that
    // needs it fails. The commonest cause is a lowercase "v" prefix: Flyway only
    // picks up "V9__name.sql", and on macOS the wrong one looks right in a listing.
    for (String file : onDisk) {
      assertTrue(
          file.startsWith("V"),
          "migration files must start with a capital V or Flyway ignores them: " + file);
    }
    assertEquals(
        onDisk.size(),
        applied.size(),
        "files on disk " + onDisk + " but applied versions " + applied);
  }

  @Test
  void everyMigrationAppliedCleanly() {
    List<Map<String, Object>> history =
        jdbc.queryForList(
            "select version, description, success from flyway_schema_history"
                + " where version is not null order by installed_rank");

    assertTrue(history.size() > 0, "no migrations ran at all");
    for (Map<String, Object> row : history) {
      assertEquals(
          true, row.get("success"), "migration " + row.get("version") + " did not apply cleanly");
    }
  }

  /** Every .sql file Flyway is pointed at, whatever it is named. */
  private List<String> migrationFileNames() throws Exception {
    org.springframework.core.io.Resource[] files =
        new org.springframework.core.io.support.PathMatchingResourcePatternResolver()
            .getResources("classpath:db/migration/*.sql");
    return java.util.Arrays.stream(files)
        .map(org.springframework.core.io.Resource::getFilename)
        .sorted()
        .toList();
  }

  @Test
  void migrationsAreNumberedWithoutGapsOrDuplicates() {
    List<Integer> versions =
        jdbc.queryForList(
            "select version::int from flyway_schema_history where version is not null"
                + " order by version::int",
            Integer.class);

    for (int i = 0; i < versions.size(); i++) {
      assertEquals(
          i + 1,
          versions.get(i),
          "migration versions must run 1..n with no gaps or repeats: " + versions);
    }
  }

  @Test
  void everyTableTheAppNeedsExists() {
    for (String table :
        List.of(
            "users",
            "customers",
            "vehicles",
            "service_tickets",
            "technicians",
            "services",
            "ticket_technicians",
            "ticket_services",
            "ticket_activity",
            "password_reset_tokens")) {
      Integer count =
          jdbc.queryForObject(
              "select count(*) from information_schema.tables"
                  + " where table_schema = 'public' and table_name = ?",
              Integer.class,
              table);
      assertEquals(1, count, "missing table: " + table);
    }
  }

  @Test
  void theRosterAndServiceCatalogWereSeeded() {
    Integer technicians =
        jdbc.queryForObject("select count(*) from technicians where is_active", Integer.class);
    Integer services =
        jdbc.queryForObject("select count(*) from services where is_active", Integer.class);

    assertTrue(technicians > 0, "no active technicians were seeded");
    assertTrue(services > 0, "no active services were seeded");
  }
}
