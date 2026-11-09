package edu.tesla.school.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Turns on the three cross-cutting features the app relies on:
 * <ul>
 *   <li>{@code @Cacheable} — Caffeine in-memory caches (see spring.cache.* in application.yml)</li>
 *   <li>{@code @Async} — e-mails and notification fan-out never block an HTTP request</li>
 *   <li>{@code @Scheduled} — daily reminders and housekeeping in {@code ScheduledJobs}</li>
 * </ul>
 */
@Configuration
@EnableCaching
@EnableAsync
@EnableScheduling
public class AsyncAndCacheConfig {

    public static final String CLASSES = "classes";
    public static final String COURSES = "courses";
    public static final String TEACHERS = "teachers";
    public static final String DASHBOARD = "dashboard";
    public static final String SCHEDULE = "schedule";
}
