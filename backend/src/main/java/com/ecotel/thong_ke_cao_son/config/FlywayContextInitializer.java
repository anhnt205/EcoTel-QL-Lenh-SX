package com.ecotel.thong_ke_cao_son.config;

import org.flywaydb.core.Flyway;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Chạy Flyway migration TRƯỚC KHI Spring context khởi tạo bất kỳ bean nào
 * (kể cả {@code DataSource}/{@code EntityManagerFactory}) — Quality Gate lượt
 * 7 của Codex (2026-09-16): schema trước đây KHÔNG có version history, dựng
 * dần qua Hibernate {@code ddl-auto: update} (chỉ ADD, không sửa/xoá đúng)
 * cộng 6 file {@code migration-*.sql} rời rạc phải CHẠY TAY sau deploy (dễ
 * quên, không ai ép buộc). Xem
 * {@code src/main/resources/db/migration/V1__baseline.sql} cho nội dung
 * migration đầu tiên, và {@code backend/migration-archive/README.md} cho các
 * file cũ đã lỗi thời.
 *
 * <p><b>Vì sao KHÔNG dùng {@code spring.flyway.*} auto-configuration chuẩn
 * của Spring Boot:</b> bản Spring Boot 4.0.7 dùng trong dự án này đã tách
 * {@code spring-boot-autoconfigure} thành nhiều module nhỏ theo từng
 * starter — package {@code org.springframework.boot.autoconfigure.flyway}
 * KHÔNG tồn tại trong bộ dependency hiện có (đã xác minh bằng cách rà toàn
 * bộ jar {@code spring-boot-*} lẫn {@code flyway-core}/
 * {@code flyway-database-postgresql}: không jar nào chứa lớp hay
 * {@code AutoConfiguration.imports} nào nhắc tới Flyway) — thêm
 * {@code spring.flyway.*} vào {@code application.yaml} hoàn toàn KHÔNG có
 * tác dụng (Flyway không chạy, không lỗi, không log gì — im lặng vô hiệu,
 * đã tự kiểm chứng bằng cách khởi động thật + kiểm tra bảng
 * {@code flyway_schema_history} không hề được tạo). Class này thay thế bằng
 * cách gọi Flyway trực tiếp, đăng ký qua
 * {@code SpringApplication.addInitializers(...)} trong {@code main()} — chạy
 * ở giai đoạn {@code ApplicationContextInitializer}, LUÔN LUÔN trước khi bất
 * kỳ {@code @Bean} nào (kể cả {@code schema.sql} qua
 * {@code DataSourceScriptDatabaseInitializer}, và Hibernate
 * {@code ddl-auto}) được tạo — đúng thứ tự bắt buộc đã ghi trong
 * {@code schema.sql}.
 *
 * <p>Đọc thông tin kết nối TRỰC TIẾP từ {@code Environment} (chưa có bean
 * {@code DataSource} nào ở giai đoạn này) — cùng property key Spring Boot
 * chuẩn ({@code spring.datasource.url/username/password}) nên không cần
 * khai báo thêm biến môi trường nào mới.
 */
public class FlywayContextInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment env = applicationContext.getEnvironment();

        if (!env.getProperty("spring.flyway.enabled", Boolean.class, true)) {
            return;
        }
        String url = env.getProperty("spring.datasource.url");
        if (url == null || url.isBlank()) {
            // Chưa có datasource thật (vd 1 số test context) -> không có gì để migrate.
            return;
        }
        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");

        Flyway flyway = Flyway.configure(FlywayContextInitializer.class.getClassLoader())
                .dataSource(url, username, password)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion(env.getProperty("spring.flyway.baseline-version", "1"))
                .baselineDescription(env.getProperty("spring.flyway.baseline-description",
                        "Baseline dua Flyway vao du an (Quality Gate luot 7, 2026-09-16)"))
                .load();
        flyway.migrate();
    }
}
