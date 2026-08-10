package com.amstar.repair.service;

import com.amstar.repair.model.Vehicle;
import com.amstar.repair.model.VehicleRepair;
import org.springframework.stereotype.Service;

@Service
public class VehicleLookupService {

    public void enrichVehicleData(VehicleRepair repair) {
        Vehicle vehicle = repair.getVehicle();

        // If a license plate is provided, we fetch the vehicle data
        if (vehicle != null && vehicle.getLicensePlate() != null && !vehicle.getLicensePlate().isEmpty()) {
            // Mock API Response for testing
            vehicle.setVin("1FTEW1E52KKD12345");
            vehicle.setMake("Ford");
            vehicle.setModel("F-150");
            vehicle.setYear(2019);

            // Simulating an Unsplash/Pexels car image return
            vehicle.setCarImageUrl("https://images.unsplash.com/photo-1559416523-40ddc3d238c?w=300&q=80");
        }
    }
}
