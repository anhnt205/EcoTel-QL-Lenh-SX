package com.ecotel.thong_ke_cao_son.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_checkpoints")
@Getter
@Setter
public class SyncCheckpoint {

    @Id
    @Column(name = "collection_name")
    private String collectionName;

    @Column(name = "resume_token", columnDefinition = "TEXT")
    private String resumeToken;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
