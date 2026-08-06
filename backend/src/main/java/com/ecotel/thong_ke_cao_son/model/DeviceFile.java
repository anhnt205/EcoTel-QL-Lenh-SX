package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DeviceFile {

    @Column(name = "file_key")
    private String key;

    @Column(name = "file_name")
    private String fileName;
}
