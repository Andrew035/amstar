package com.amstar.repair;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RepairServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(RepairServiceApplication.class, args);
  }
}
