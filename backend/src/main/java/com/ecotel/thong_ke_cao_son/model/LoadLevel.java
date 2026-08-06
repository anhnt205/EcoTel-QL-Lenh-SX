package com.ecotel.thong_ke_cao_son.model;

import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoadLevel {

    @Enumerated(EnumType.STRING)
    @Column(name = "load_level_type", nullable = false)
    private LoadLevelType type = LoadLevelType.FULL_LOAD;

    // Chỉ có giá trị khi type = OTHER, ví dụ "1/2", "1/3"
    @Column(name = "load_level_custom_value")
    private String customValue;
}