package edu.tesla.school.mail;

import edu.tesla.school.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Sends HTML e-mails rendered from Thymeleaf templates in {@code templates/mail}.
 * Every public method is {@code @Async}: callers never wait for SMTP, and a mail
 * server outage is logged instead of failing the business operation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.ENGLISH);

    private final JavaMailSender mailSender;
    private final ITemplateEngine templateEngine;
    private final AppProperties props;

    @Async
    public void sendWelcome(String to, String name, String role, String temporaryPassword) {
        send(to, "Welcome to " + props.name(), "welcome", Map.of(
                "name", name,
                "role", role.charAt(0) + role.substring(1).toLowerCase(),
                "email", to,
                "temporaryPassword", temporaryPassword,
                "actionUrl", props.frontendUrl() + "/login"));
    }

    @Async
    public void sendPasswordReset(String to, String name, String token) {
        send(to, "Reset your " + props.name() + " password", "password-reset", Map.of(
                "name", name,
                "actionUrl", props.frontendUrl() + "/reset-password?token=" + token));
    }

    @Async
    public void sendAdminPasswordReset(String to, String name, String temporaryPassword) {
        send(to, "Your " + props.name() + " password was reset", "admin-password-reset", Map.of(
                "name", name,
                "temporaryPassword", temporaryPassword,
                "actionUrl", props.frontendUrl() + "/login"));
    }

    @Async
    public void sendGradePosted(String to, String name, String course, String title, String score, String percent) {
        send(to, "New grade in " + course, "grade-posted", Map.of(
                "name", name,
                "course", course,
                "title", title,
                "score", score,
                "percent", percent,
                "actionUrl", props.frontendUrl() + "/grades"));
    }

    @Async
    public void sendAbsenceAlert(String to, String recipientName, String studentName, String course,
                                 LocalDate date, String status) {
        send(to, studentName + " was marked " + status.toLowerCase() + " in " + course, "absence-alert", Map.of(
                "name", recipientName,
                "studentName", studentName,
                "course", course,
                "date", DATE.format(date),
                "status", status.toLowerCase(),
                "actionUrl", props.frontendUrl() + "/attendance"));
    }

    @Async
    public void sendAnnouncement(String to, String name, String title, String content, String author) {
        send(to, "Announcement: " + title, "announcement", Map.of(
                "name", name,
                "title", title,
                "content", content,
                "author", author,
                "actionUrl", props.frontendUrl() + "/announcements"));
    }

    private void send(String to, String subject, String template, Map<String, Object> variables) {
        try {
            Map<String, Object> vars = new HashMap<>(variables);
            vars.put("appName", props.name());
            vars.put("frontendUrl", props.frontendUrl());
            vars.put("year", LocalDate.now().getYear());
            Context ctx = new Context(Locale.ENGLISH, vars);
            String html = templateEngine.process("mail/" + template, ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(props.mailFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Mail '{}' sent to {}", template, to);
        } catch (Exception e) {
            log.warn("Could not send mail '{}' to {}: {}", template, to, e.getMessage());
        }
    }
}
