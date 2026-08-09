package com.amstar.repair.service;

import com.amstar.repair.model.VehicleRepair;
import org.springframework.stereotype.Service;

@Service
public class VehicleLookupService {

    public void enrichVehicleData(VehicleRepair repair) {
        // If a license plate is provided, we fetch the vehicle data
        if (repair.getLicensePlate() != null && !repair.getLicensePlate().isEmpty()) {
            // Mock API Response for testing
            repair.setMake("Ford");
            repair.setModel("F-150");
            repair.setYear(2019);

            // Simulating an Unsplash/Pexels car image return
            repair.setCarImageUrl("https://images.unsplash.com/photo-1559416523-40ddc3d238c?w=300&q=80");
        }
    }
}
