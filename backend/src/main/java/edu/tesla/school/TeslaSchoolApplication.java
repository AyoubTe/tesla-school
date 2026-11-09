package edu.tesla.school;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TeslaSchoolApplication {

    public static void main(String[] args) {
        SpringApplication.run(TeslaSchoolApplication.class, args);
    }
}
