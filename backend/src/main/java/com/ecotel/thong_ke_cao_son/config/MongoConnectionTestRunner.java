package com.ecotel.thong_ke_cao_son.config;

import com.mongodb.client.MongoDatabase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MongoConnectionTestRunner implements ApplicationRunner {

    private final MongoDatabase mongoSyncDatabase;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Danh sách collection trong Mongo: {}",
                mongoSyncDatabase.listCollectionNames().into(new java.util.ArrayList<>()));
    }
}
