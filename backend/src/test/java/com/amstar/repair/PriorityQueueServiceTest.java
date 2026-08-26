package com.amstar.repair;

import com.amstar.repair.model.Vehicle;
import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import com.amstar.repair.service.PriorityQueueService;
import com.amstar.repair.service.TicketAssemblyService;
import com.amstar.repair.service.VehicleLookupService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class PriorityQueueServiceTest {

  @Test
  public void testHigherSeverityYieldsHigherScore() {
    VehicleRepairRepository repository = Mockito.mock(VehicleRepairRepository.class);
    VehicleLookupService lookupService = Mockito.mock(VehicleLookupService.class);
    TicketAssemblyService assembly = Mockito.mock(TicketAssemblyService.class);
    PriorityQueueService service = new PriorityQueueService(repository, lookupService, assembly);

    LocalDate today = LocalDate.now();
    LocalDate dueDate = today.plusDays(3);

    VehicleRepair lowSeverity = new VehicleRepair();
    lowSeverity.setVehicle(new Vehicle());
    lowSeverity.setId(1L);
    lowSeverity.setCustomerName("John");
    lowSeverity.setServiceType("Oil Change");
    lowSeverity.setSeverity(1);
    lowSeverity.setEntryDate(today);
    lowSeverity.setExpectedCompletionDate(dueDate);
    lowSeverity.setStatus("PENDING");

    VehicleRepair highSeverity = new VehicleRepair();
    highSeverity.setVehicle(new Vehicle());
    highSeverity.setId(2L);
    highSeverity.setCustomerName("Jane");
    highSeverity.setServiceType("Transmission Rebuild");
    highSeverity.setSeverity(5);
    highSeverity.setEntryDate(today);
    highSeverity.setExpectedCompletionDate(dueDate);
    highSeverity.setStatus("PENDING");

    double lowScore = service.calculatePriorityScore(lowSeverity);
    double highScore = service.calculatePriorityScore(highSeverity);

    assertTrue(highScore > lowScore, "High severity repair must have a high priority score.");
  }
}
