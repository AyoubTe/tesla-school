package edu.tesla.school.user;

import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.common.PageResponse;
import edu.tesla.school.user.UserDtos.CreateAdminRequest;
import edu.tesla.school.user.UserDtos.StatusRequest;
import edu.tesla.school.user.UserDtos.UserDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final CurrentUser currentUser;

    @GetMapping
    public PageResponse<UserDto> search(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) Role role,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return userService.search(q, role, page, size);
    }

    @PostMapping("/admins")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        return userService.createAdmin(request);
    }

    @PatchMapping("/{id}/status")
    public UserDto setStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        return userService.setEnabled(id, request.enabled(), currentUser.email());
    }

    @PostMapping("/{id}/reset-password")
    public UserDto resetPassword(@PathVariable Long id) {
        return userService.resetPassword(id);
    }
}
