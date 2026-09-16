package com.amstar.repair.config;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Turns the failures that actually happen into 400s with a message the UI can show, and everything
 * else into an opaque 500 that is logged but no echoed.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  /** Bean-validation failures from @Valid. */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> onValidation(MethodArgumentNotValidException ex) {
    Map<String, String> fields = new LinkedHashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(e -> fields.putIfAbsent(e.getField(), e.getDefaultMessage()));

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", fields.values().stream().findFirst().orElse("Invalid request"));
    body.put("fields", fields);
    return ResponseEntity.badRequest().body(body);
  }

  /** Malformed JSON, or a date/number that will not parse. */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, String>> onUnreadable(HttpMessageNotReadableException ex) {
    log.warn("Rejected malformed request body: {}", ex.getMostSpecificCause().getMessage());
    return ResponseEntity.badRequest().body(Map.of("error", "Request body could not be read"));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> onIllegalArgument(IllegalArgumentException ex) {
    return ResponseEntity.badRequest()
        .body(Map.of("error", ex.getMessage() == null ? "Invalid request" : ex.getMessage()));
  }

  /**
   * A database constraint caught what the application did not. The constraint name is a schema
   * detail, so it goes to the log, not to the client - but it is logged loudly, because reaching
   * here means a validation gap upstream.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Map<String, String>> onConstraint(DataIntegrityViolationException ex) {
    log.error("Contraint violation reached the database", ex);
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(Map.of("error", "That change conflicts with existing data"));
  }

  /** A path variable of the wrong type, e.g. /api/repairs/abc/status. */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Map<String, String>> onTypeMismatch(
      MethodArgumentTypeMismatchException ex) {
    return ResponseEntity.badRequest().body(Map.of("error", "Invalid value for " + ex.getName()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> onUnexpected(Exception ex) {
    // Spring's own client errors - unknown path (404), wrong HTTP method (405) -
    // already carry the right status. Without this they become 500s and are
    // logged as server failures, burying the real ones.
    if (ex instanceof ErrorResponse errorResponse) {
      HttpStatusCode status = errorResponse.getStatusCode();
      HttpStatus known = HttpStatus.resolve(status.value());
      return ResponseEntity.status(status)
          .body(Map.of("error", known != null ? known.getReasonPhrase() : "Request failed"));
    }

    log.error("Unhandled exception", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Something went wrong. Please try again."));
  }
}
