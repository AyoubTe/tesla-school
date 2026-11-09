package edu.tesla.school.common;

import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.user.Role;
import edu.tesla.school.user.User;
import edu.tesla.school.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves the signed-in user from the JWT subject (the user's email). */
@Component
@RequiredArgsConstructor
public class CurrentUser {

    private final UserRepository userRepository;

    public String email() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new ApiExceptions.ForbiddenException("Not signed in");
        }
        return auth.getName();
    }

    public User get() {
        String email = email();
        return userRepository.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("User", email));
    }

    public boolean hasRole(Role role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role.name()));
    }
}
