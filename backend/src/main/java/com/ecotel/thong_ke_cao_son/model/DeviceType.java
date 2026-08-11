package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class DeviceType {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "device_type_seq")
    @SequenceGenerator(name = "device_type_seq", sequenceName = "device_type_seq", allocationSize = 50)
    private Long id;

    @Column(name = "mongo_id", unique = true)
    private String mongoId;

    @NotBlank(message = "DeviceType is required")
    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "code")
    private String code;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "group_type")
    private DeviceGroup group;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
