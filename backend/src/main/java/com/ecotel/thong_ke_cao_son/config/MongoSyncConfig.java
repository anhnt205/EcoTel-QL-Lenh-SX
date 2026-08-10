package com.ecotel.thong_ke_cao_son.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MongoSyncConfig {

    @Value("${mongo.sync.uri}")
    private String mongoUri;

    @Value("${mongo.sync.database}")
    private String databaseName;

    @Bean(destroyMethod = "close")
    public MongoClient mongoSyncClient() {
        return MongoClients.create(mongoUri);
    }

    @Bean
    public MongoDatabase mongoSyncDatabase(MongoClient client) {
        return client.getDatabase(databaseName);
    }
}
