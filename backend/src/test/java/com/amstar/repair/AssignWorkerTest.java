package com.amstar.repair;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import com.amstar.repair.service.ActivityService;
import com.amstar.repair.service.PriorityQueueService;
import com.amstar.repair.service.TicketAssemblyService;
import com.amstar.repair.service.VehicleLookupService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

public class AssignWorkerTest {

  /**
   * Regression: assignWorker used to call setAssignedWorker, which only parks the string in
   * a @Transient field. The join table was never written, so the PACTCH returned 200 and changed
   * nothing
   */
  @Test
  public void testAssignWorkerWritesTheJoinTable() {
    VehicleRepairRepository repository = Mockito.mock(VehicleRepairRepository.class);
    VehicleLookupService lookupService = Mockito.mock(VehicleLookupService.class);
    TicketAssemblyService assembly = Mockito.mock(TicketAssemblyService.class);
    PriorityQueueService service =
        new PriorityQueueService(
            repository, lookupService, assembly, Mockito.mock(ActivityService.class));

    VehicleRepair repair = new VehicleRepair();
    repair.setId(1L);
    Mockito.when(repository.findById(1L)).thenReturn(Optional.of(repair));

    assertTrue(service.assignWorker(1L, "Melvin, Adolfo"));

    Mockito.verify(assembly).applyTechnicians(repair, "Melvin, Adolfo");
    Mockito.verify(repository).save(repair);
  }

  @Test
  public void testAssignWorkerOnMissingTicketReportsFailure() {
    VehicleRepairRepository repository = Mockito.mock(VehicleRepairRepository.class);
    PriorityQueueService service =
        new PriorityQueueService(
            repository,
            Mockito.mock(VehicleLookupService.class),
            Mockito.mock(TicketAssemblyService.class),
            Mockito.mock(ActivityService.class));

    Mockito.when(repository.findById(99L)).thenReturn(Optional.empty());

    assertFalse(service.assignWorker(99L, "Melvin"));
  }
}
