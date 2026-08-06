# Graph Report - .  (2026-08-06)

## Corpus Check
- Corpus is ~0 words - fits in a single context window. You may not need a graph.

## Summary
- 78 nodes · 54 edges · 25 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 24 · method: 18 · inherits: 5 · imports: 4 · calls: 2 · semantically_similar_to: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 0 · Candidates: 0
- Excluded: 89 untracked · 109 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.
## God Nodes (most connected - your core abstractions)
1. `GlobalExceptionHandler` - 8 edges
2. `ShiftRepository` - 5 edges
3. `ApiResponse` - 4 edges
4. `ShiftController` - 3 edges
5. `BadRequestException` - 3 edges
6. `ResourceNotFoundException` - 3 edges
7. `ShiftService` - 3 edges
8. `ShiftMapper` - 2 edges
9. `ShiftResponse` - 1 edges
10. `CargoGroup` - 1 edges

## Surprising Connections (you probably didn't know these)
- `Dev Profile Configuration` --semantically_similar_to--> `Prod Profile Configuration`  [INFERRED] [semantically similar]
  src/main/resources/application-dev.yaml → src/main/resources/application-prod.yaml

## Hyperedges (group relationships)
- **Spring Boot Application thong-ke-cao-son** — application_dev, application_prod [INFERRED 0.90]
- **Docker Deployment Stack** — docker_compose_thong_ke, dockerfile_backend [EXTRACTED 1.00]

## Communities

### Community 0 - "Global Exception Handling"
Cohesion: 0.22
Nodes (1): GlobalExceptionHandler

### Community 1 - "Shift Data Access Layer"
Cohesion: 0.28
Nodes (5): JpaRepository, Long, ShiftMapper, ShiftRepository, Shift

### Community 2 - "Custom Exception Types"
Cohesion: 0.29
Nodes (3): BadRequestException, ResourceNotFoundException, RuntimeException

### Community 3 - "API Response Builder"
Cohesion: 0.60
Nodes (1): ApiResponse

### Community 4 - "Shift REST Controller"
Cohesion: 0.50
Nodes (1): ShiftController

### Community 5 - "Shift Business Service"
Cohesion: 0.50
Nodes (1): ShiftService

### Community 6 - "Spring Profile Configs"
Cohesion: 1.00
Nodes (2): Dev Profile Configuration, Prod Profile Configuration

### Community 7 - "Cargo Group Model"
Cohesion: 1.00
Nodes (1): CargoGroup

### Community 8 - "Cargo Type Model"
Cohesion: 1.00
Nodes (1): CargoType

### Community 9 - "Coordinates Model"
Cohesion: 1.00
Nodes (1): Coordinates

### Community 10 - "Department Model"
Cohesion: 1.00
Nodes (1): Department

### Community 11 - "Device File Model"
Cohesion: 1.00
Nodes (1): DeviceFile

### Community 12 - "Device Model"
Cohesion: 1.00
Nodes (1): Device

### Community 13 - "Device Model Type"
Cohesion: 1.00
Nodes (1): DeviceModel

### Community 14 - "Device Type Enum"
Cohesion: 1.00
Nodes (1): DeviceType

### Community 15 - "Load Level Model"
Cohesion: 1.00
Nodes (1): LoadLevel

### Community 16 - "Location Model"
Cohesion: 1.00
Nodes (1): Location

### Community 17 - "Material Model"
Cohesion: 1.00
Nodes (1): Material

### Community 18 - "Material Value History"
Cohesion: 1.00
Nodes (1): MaterialValueHistory

### Community 19 - "Position Model"
Cohesion: 1.00
Nodes (1): Position

### Community 20 - "Shift Domain Model"
Cohesion: 1.00
Nodes (1): Shift

### Community 21 - "User Model"
Cohesion: 1.00
Nodes (1): User

### Community 22 - "Shift Response DTO"
Cohesion: 1.00
Nodes (1): ShiftResponse

### Community 23 - "Docker Compose Stack"
Cohesion: 1.00
Nodes (1): Docker Compose Orchestration

### Community 24 - "Backend Dockerfile"
Cohesion: 1.00
Nodes (1): Backend Dockerfile

## Knowledge Gaps
- **20 isolated node(s):** `ShiftResponse`, `CargoGroup`, `CargoType`, `Coordinates`, `Department` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Global Exception Handling`** (1 nodes): `GlobalExceptionHandler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Response Builder`** (1 nodes): `ApiResponse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shift REST Controller`** (1 nodes): `ShiftController`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shift Business Service`** (1 nodes): `ShiftService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Spring Profile Configs`** (2 nodes): `Dev Profile Configuration`, `Prod Profile Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cargo Group Model`** (1 nodes): `CargoGroup`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cargo Type Model`** (1 nodes): `CargoType`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Coordinates Model`** (1 nodes): `Coordinates`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Department Model`** (1 nodes): `Department`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Device File Model`** (1 nodes): `DeviceFile`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Device Model`** (1 nodes): `Device`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Device Model Type`** (1 nodes): `DeviceModel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Device Type Enum`** (1 nodes): `DeviceType`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Load Level Model`** (1 nodes): `LoadLevel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Location Model`** (1 nodes): `Location`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Material Model`** (1 nodes): `Material`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Material Value History`** (1 nodes): `MaterialValueHistory`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Position Model`** (1 nodes): `Position`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shift Domain Model`** (1 nodes): `Shift`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User Model`** (1 nodes): `User`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shift Response DTO`** (1 nodes): `ShiftResponse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Docker Compose Stack`** (1 nodes): `Docker Compose Orchestration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Backend Dockerfile`** (1 nodes): `Backend Dockerfile`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `ShiftResponse`, `CargoGroup`, `CargoType` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._