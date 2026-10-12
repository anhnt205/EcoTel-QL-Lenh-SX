package com.ecotel.thong_ke_cao_son;

import com.ecotel.thong_ke_cao_son.config.FlywayContextInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ThongKeCaoSonApplication {

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(ThongKeCaoSonApplication.class);
		// Xem javadoc FlywayContextInitializer — Spring Boot 4.0.7 dùng ở đây
		// KHÔNG có sẵn auto-configuration cho Flyway (đã xác minh), nên đăng
		// ký thủ công, chạy TRƯỚC bất kỳ bean nào (kể cả schema.sql/Hibernate
		// ddl-auto).
		app.addInitializers(new FlywayContextInitializer());
		app.run(args);
	}

}
