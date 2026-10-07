package com.amstar.repair.service;

import com.amstar.repair.model.TicketActivity;
import com.amstar.repair.model.Vehicle;
import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.TicketActivityRepository;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Records ticket changes for the dashboard activity feed.
 *
 * <p>Called from inside PriorityQueueService's transactions, so an event is only stored if the
 * change it describes is also stored.
 */
@Service
public class ActivityService {

  private final TicketActivityRepository activity;

  public ActivityService(TicketActivityRepository activity) {
    this.activity = activity;
  }

  public void record(VehicleRepair repair, String action, String detail) {
    activity.save(
        new TicketActivity(
            repair.getId(), label(repair), currentActor(), action, truncate(detail, 500)));
  }

  public List<TicketActivity> recent() {
    return activity.findTop30ByOrderByCreatedAtDescIdDesc();
  }

  /** "2010 FORD E-250 · Kane", snapshotted so it survives the ticket's deletion. */
  static String label(VehicleRepair repair) {
    Vehicle v = repair.getVehicle();
    String car =
        v == null
            ? ""
            : String.join(
                    " ",
                    v.getYear() == null ? "" : String.valueOf(v.getYear()),
                    v.getMake() == null ? "" : v.getMake(),
                    v.getModel() == null ? "" : v.getModel())
                .trim()
                .replaceAll("\\s+", " ");
    String customer = repair.getCustomerName();
    String label = car.isEmpty() ? "Ticket #" + repair.getId() : car;
    if (customer != null && !customer.isBlank()) label += " · " + customer;
    return truncate(label, 200);
  }

  /** The JWT subject: the part of the user's email before the @. */
  private static String currentActor() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return auth == null || auth.getName() == null ? "system" : auth.getName();
  }

  private static String truncate(String s, int max) {
    return s == null || s.length() <= max ? s : s.substring(0, max);
  }
}
