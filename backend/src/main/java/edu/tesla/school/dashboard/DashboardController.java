package edu.tesla.school.dashboard;

import edu.tesla.school.auth.AuthDtos.MeDto;
import edu.tesla.school.auth.AuthService;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.dashboard.DashboardService.DashboardDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService service;
    private final AuthService authService;
    private final CurrentUser currentUser;

    @GetMapping
    public DashboardDto dashboard() {
        MeDto me = authService.me(currentUser.email());
        return switch (me.role()) {
            case ADMIN -> new DashboardDto("ADMIN", service.admin(), null, null);
            case TEACHER -> new DashboardDto("TEACHER", null,
                    me.teacherId() == null ? null : service.teacher(me), null);
            case STUDENT -> new DashboardDto("STUDENT", null, null,
                    me.studentId() == null ? null : service.student(me));
        };
    }
}
