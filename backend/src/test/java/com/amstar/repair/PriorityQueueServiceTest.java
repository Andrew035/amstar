package com.amstar.repair;

import com.amstar.repair.model.VehicleRepair;
import com.amstar.repair.repository.VehicleRepairRepository;
import com.amstar.repair.service.PriorityQueueService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class PriorityQueueServiceTest {

    @Test
    public void testHigherSeverityYieldsHigherScore() {
        VehicleRepairRepository repository = Mockito.mock(VehicleRepairRepository.class);
        PriorityQueueService service = new PriorityQueueService(repository);

        LocalDate today = LocalDate.now();
        LocalDate dueDate = today.plusDays(3);

        VehicleRepair lowSeverity = new VehicleRepair(1L, "John", "Civic", "Oil Change", 1, today, dueDate, "PENDING");
        VehicleRepair highSeverity = new VehicleRepair(2L, "Jane", "F-150", "Transmission Rebuild", 5, today, dueDate,
                "PENDING");

        double lowScore = service.calculatePriorityScore(lowSeverity);
        double highScore = service.calculatePriorityScore(highSeverity);

        assertTrue(highScore > lowScore, "High severity repair must have a high priority score.");
    }
}
