package com.amstar.repair.controller;

import com.amstar.repair.model.TicketActivity;
import com.amstar.repair.service.ActivityService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only feed for the dashboard. Any signed-in user may read it; covered by SecurityConfig's
 * anyRequest().authenticated(). Pricing events carry no amount, so shop-view users do not learn
 * prices from here.
 */
@RestController
@RequestMapping("/api/activity")
public class ActivityController {

  private final ActivityService activityService;

  public ActivityController(ActivityService activityService) {
    this.activityService = activityService;
  }

  @GetMapping
  public List<TicketActivity> recent() {
    return activityService.recent();
  }
}
