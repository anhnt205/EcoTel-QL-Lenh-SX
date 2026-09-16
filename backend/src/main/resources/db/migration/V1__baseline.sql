-- ==================================================================
-- V1 — BASELINE: chụp lại TOÀN BỘ schema hiện có tại thời điểm đưa Flyway
-- vào dự án (Quality Gate lượt 7 của Codex, 2026-09-16).
--
-- VÌ SAO CÓ FILE NÀY: trước lượt này, schema hoàn toàn không có version
-- history — được dựng dần qua Hibernate `ddl-auto: update` (chỉ ADD, không
-- bao giờ sửa/xoá đúng) cộng với 6 file `migration-*.sql` rời rạc phải CHẠY
-- TAY sau khi deploy (không ai ép buộc, dễ quên — đúng lỗ hổng vận hành
-- Codex nêu). Nội dung dưới đây là kết quả `pg_dump --schema-only` từ CSDL
-- preview đang chạy THẬT (đã áp dụng đủ cả 6 migration tay + mọi cột do
-- schema.sql/Hibernate sinh ra tính tới ngày 2026-09-16) — tức là ĐÚNG
-- SCHEMA HIỆN TẠI, không phải suy đoán lại từ lịch sử.
--
-- CÁCH DÙNG:
--   • CSDL HOÀN TOÀN MỚI (môi trường mới/disaster recovery): Flyway chạy
--     file này đầu tiên, dựng đủ toàn bộ bảng/sequence/khoá — KHÔNG cần
--     Hibernate ddl-auto tạo gì thêm, KHÔNG cần chạy tay bất kỳ file
--     migration-*.sql nào trong thư mục backend/ (đã lỗi thời, xem
--     backend/migration-archive/README.md).
--   • CSDL HIỆN HỮU (dev/staging/preview/prod đã chạy từ trước, CHƯA có
--     bảng flyway_schema_history): cấu hình `spring.flyway.baseline-on-
--     migrate=true` + `baseline-version=1` (xem application.yaml) khiến
--     Flyway tự đánh dấu "đã ở V1" mà KHÔNG chạy lại nội dung file này —
--     vì schema ở đó đã đúng y hệt (chính là nguồn của file này).
--
-- TỪ V2 TRỞ ĐI: mọi thay đổi schema/dữ liệu (thêm cột NOT NULL không có
-- default, đổi FK, migrate dữ liệu…) PHẢI là 1 file Flyway MỚI
-- (`V2__...sql`, `V3__...sql`…) — không sửa lại file V1 này, không quay về
-- cách "sửa entity rồi dặn nhau chạy tay 1 script".
-- ==================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: acceptance_product_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.acceptance_product_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: acceptance_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acceptance_products (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: cargo_group_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargo_group_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cargo_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cargo_groups (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: cargo_type_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargo_type_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cargo_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cargo_types (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    cargo_group_id bigint NOT NULL,
    acceptance_product character varying(255),
    ttl_clh character varying(255),
    acceptance_product_id bigint,
    ttl_clh_id bigint
);


--
-- Name: classification_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.classification_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: classifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classifications (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: coefficient_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coefficient_item_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coefficient_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coefficient_items (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone,
    value numeric(19,6) NOT NULL
);


--
-- Name: density_parameter_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.density_parameter_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: density_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.density_parameters (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    density_dry numeric(19,6) NOT NULL,
    density_wet numeric(19,6) NOT NULL,
    effective_from date NOT NULL,
    effective_to date NOT NULL,
    note text,
    updated_at timestamp(6) without time zone,
    cargo_type_id bigint NOT NULL,
    excavation_area_id bigint
);


--
-- Name: department_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_resources (
    department_id bigint NOT NULL,
    resource character varying(255) NOT NULL
);


--
-- Name: department_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.department_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    description text,
    mongo_id character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    full_data_scope boolean DEFAULT false NOT NULL
);


--
-- Name: device_file_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_file_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_files (
    device_id bigint NOT NULL,
    file_name character varying(255),
    file_key character varying(255)
);


--
-- Name: device_model_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_model_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_models (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    mongo_id character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: device_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_type_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.device_type_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: device_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_types (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    group_type character varying(255),
    mongo_id character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT device_types_group_type_check CHECK (((group_type)::text = ANY ((ARRAY['XE'::character varying, 'MAY'::character varying])::text[])))
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id bigint NOT NULL,
    capacity double precision,
    code character varying(255) NOT NULL,
    latitude double precision,
    longitude double precision,
    created_at timestamp(6) without time zone,
    fuel_type character varying(255),
    mongo_id character varying(255),
    name character varying(255),
    note text,
    power double precision,
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    vehicle_number character varying(255),
    category_id bigint,
    created_by bigint,
    department_id bigint,
    material_id bigint,
    updated_by bigint,
    bucket_capacity numeric(19,6),
    car_renovation character varying(255),
    quality_level character varying(255),
    vehicle_class character varying(255),
    category_class_id bigint,
    fuel_class_id bigint,
    vehicle_rank_id bigint,
    vehicle_type_id bigint,
    CONSTRAINT devices_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'IN_USE'::character varying, 'MAINTENANCE'::character varying, 'BROKEN'::character varying, 'RETIRED'::character varying])::text[])))
);


--
-- Name: excavation_area_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.excavation_area_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: excavation_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excavation_areas (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone,
    area_group character varying(2)
);


--
-- Name: excavation_report_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.excavation_report_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: excavation_report_trip_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.excavation_report_trip_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: excavation_report_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excavation_report_trips (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    load_level_custom_value character varying(255),
    load_level_type character varying(255) NOT NULL,
    note text,
    status character varying(30) NOT NULL,
    trip_count integer,
    updated_at timestamp(6) without time zone,
    cargo_group_id bigint NOT NULL,
    cargo_type_id bigint NOT NULL,
    excavation_report_id bigint NOT NULL,
    vehicle_device_id bigint NOT NULL,
    CONSTRAINT excavation_report_trips_load_level_type_check CHECK (((load_level_type)::text = ANY ((ARRAY['FULL_LOAD'::character varying, 'RODA_2_3'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT excavation_report_trips_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REVISION_REQUESTED'::character varying])::text[])))
);


--
-- Name: excavation_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excavation_reports (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    excavation_floor character varying(255),
    fuel_beginning double precision,
    fuel_ending double precision,
    fuel_received double precision,
    fuel_used double precision,
    report_date date NOT NULL,
    updated_at timestamp(6) without time zone,
    employee_id bigint NOT NULL,
    excavator_device_id bigint NOT NULL,
    receiving_location_id bigint NOT NULL,
    shift_id bigint NOT NULL
);


--
-- Name: load_level_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.load_level_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id bigint NOT NULL,
    code character varying(255),
    latitude double precision,
    longitude double precision,
    created_at timestamp(6) without time zone,
    description character varying(255),
    distance double precision,
    mongo_id character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: material_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material_value_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_value_history (
    material_id bigint NOT NULL,
    density double precision,
    dry_density double precision,
    end_time timestamp(6) without time zone,
    start_time timestamp(6) without time zone
);


--
-- Name: material_value_history_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_value_history_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id bigint NOT NULL,
    accepted_product character varying(255),
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    mongo_id character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);


--
-- Name: matrix_axis_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matrix_axis_entries (
    id bigint NOT NULL,
    axis character varying(3) NOT NULL,
    entry_key character varying(255) NOT NULL,
    label character varying(255),
    numeric_value numeric(19,6),
    sort_order integer NOT NULL,
    definition_id bigint NOT NULL,
    CONSTRAINT matrix_axis_entries_axis_check CHECK (((axis)::text = ANY ((ARRAY['ROW'::character varying, 'COL'::character varying])::text[])))
);


--
-- Name: matrix_axis_entry_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matrix_axis_entry_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matrix_cell_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matrix_cell_seq
    START WITH 1
    INCREMENT BY 100
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matrix_cells; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matrix_cells (
    id bigint NOT NULL,
    col_key character varying(255) NOT NULL,
    row_key character varying(255) NOT NULL,
    value numeric(19,6) NOT NULL,
    definition_id bigint NOT NULL
);


--
-- Name: matrix_definition_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matrix_definition_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matrix_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matrix_definitions (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    col_axis_label character varying(255),
    col_source_path character varying(255),
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    numeric_col_axis boolean NOT NULL,
    numeric_row_axis boolean NOT NULL,
    row_axis_label character varying(255),
    row_source_path character varying(255),
    updated_at timestamp(6) without time zone,
    value_label character varying(255),
    value_scale integer NOT NULL,
    effective_from date,
    effective_to date,
    version_label character varying(255)
);


--
-- Name: model_period_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.model_period_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: model_period_value_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.model_period_value_seq
    START WITH 1
    INCREMENT BY 100
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: model_period_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_period_values (
    id bigint NOT NULL,
    value numeric(19,6) NOT NULL,
    vehicle_key character varying(255) NOT NULL,
    model_period_id bigint NOT NULL
);


--
-- Name: model_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_periods (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    effective_from date NOT NULL,
    effective_to date NOT NULL,
    note text,
    updated_at timestamp(6) without time zone,
    cargo_type_id bigint NOT NULL
);


--
-- Name: pickup_point_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pickup_point_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pickup_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_points (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: position_permission_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.position_permission_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: position_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.position_permissions (
    id bigint NOT NULL,
    can_approve boolean NOT NULL,
    can_create boolean NOT NULL,
    can_delete boolean NOT NULL,
    can_read boolean NOT NULL,
    can_update boolean NOT NULL,
    resource character varying(255) NOT NULL,
    position_id bigint NOT NULL
);


--
-- Name: position_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.position_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    mongo_id character varying(255),
    name character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    department_id bigint
);


--
-- Name: production_result_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_result_seq
    START WITH 1
    INCREMENT BY 100
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_results (
    id bigint NOT NULL,
    acceptance_product character varying(255),
    bulk_density_used numeric(19,6),
    calculated_at timestamp(6) without time zone,
    density_used numeric(19,6),
    final_tkm numeric(19,6),
    final_ton numeric(19,6),
    hs_m3 numeric(19,10),
    hs_tkm numeric(19,10),
    hs_ton numeric(19,10),
    model_used numeric(19,6),
    production_date date NOT NULL,
    seam_group_excavator_key character varying(255) NOT NULL,
    survey_m3 numeric(19,6),
    survey_tkm numeric(19,6),
    survey_ton numeric(19,6),
    tke_mode boolean NOT NULL,
    total_m3 numeric(19,6),
    total_tkm numeric(19,6),
    total_ton numeric(19,6),
    report_period_id bigint NOT NULL,
    transport_trip_id bigint NOT NULL,
    fuel_base_consumption numeric(19,6),
    fuel_current_norm numeric(19,6),
    fuel_norm numeric(19,6),
    fuel_total_before_adjustment numeric(19,6),
    productivity_norm numeric(19,6),
    cargo_code character varying(255),
    cargo_ttl_code character varying(255),
    seam_kpmb character varying(255),
    density_no_moisture numeric(19,6),
    density_original numeric(19,6),
    total_m3_original numeric(19,6),
    total_tkm_no_moisture numeric(19,6),
    total_ton_no_moisture numeric(19,6)
);


--
-- Name: receiving_point_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receiving_point_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receiving_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receiving_points (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    seam_group character varying(255),
    updated_at timestamp(6) without time zone,
    seam_group_id bigint
);


--
-- Name: reconciliation_data_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_data_history (
    id bigint NOT NULL,
    cargo_type_name character varying(255),
    created_at timestamp(6) without time zone,
    employee_full_name character varying(255),
    employee_salary_code character varying(255),
    load_level_custom_value character varying(255),
    load_level_type character varying(30),
    note text,
    side character varying(20) NOT NULL,
    trip_count integer,
    trip_id bigint NOT NULL,
    reconciliation_decision_id bigint NOT NULL,
    CONSTRAINT reconciliation_data_history_load_level_type_check CHECK (((load_level_type)::text = ANY ((ARRAY['FULL_LOAD'::character varying, 'RODA_2_3'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT reconciliation_data_history_side_check CHECK (((side)::text = ANY ((ARRAY['TRANSPORT'::character varying, 'EXCAVATION'::character varying])::text[])))
);


--
-- Name: reconciliation_data_history_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_data_history_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_decision_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reconciliation_decision_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reconciliation_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_decisions (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    note text,
    status character varying(30) NOT NULL,
    updated_at timestamp(6) without time zone,
    excavation_report_trip_id bigint,
    transport_report_trip_id bigint,
    CONSTRAINT reconciliation_decisions_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REVISION_REQUESTED'::character varying])::text[])))
);


--
-- Name: report_period_audit_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_period_audit_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_period_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_period_audits (
    id bigint NOT NULL,
    action character varying(16) NOT NULL,
    performed_at timestamp(6) without time zone NOT NULL,
    performed_by_full_name character varying(255),
    performed_by_username character varying(255) NOT NULL,
    reason text,
    tke_mode boolean,
    total_m3 numeric(19,6),
    total_tkm numeric(19,6),
    total_ton numeric(19,6),
    report_period_id bigint NOT NULL,
    CONSTRAINT report_period_audits_action_check CHECK (((action)::text = ANY ((ARRAY['LOCK'::character varying, 'UNLOCK'::character varying])::text[])))
);


--
-- Name: report_period_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_period_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_periods (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    display_name character varying(255),
    from_date date NOT NULL,
    period_month integer NOT NULL,
    note text,
    period_index integer NOT NULL,
    to_date date NOT NULL,
    updated_at timestamp(6) without time zone,
    period_year integer NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    stale boolean DEFAULT false NOT NULL
);


--
-- Name: seam_group_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seam_group_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seam_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seam_groups (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: shift_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shift_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    description character varying(255),
    end_time character varying(255),
    mongo_id character varying(255),
    name integer NOT NULL,
    start_time character varying(255),
    updated_at timestamp(6) without time zone
);


--
-- Name: survey_coefficient_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.survey_coefficient_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: survey_coefficients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_coefficients (
    id bigint NOT NULL,
    acceptance_product character varying(255) NOT NULL,
    generated_at timestamp(6) without time zone,
    hs_m3 numeric(19,10),
    hs_tkm numeric(19,10),
    hs_ton numeric(19,10),
    kind character varying(10) NOT NULL,
    seam_group_excavator_key character varying(255) NOT NULL,
    survey_m3 numeric(19,6),
    survey_tkm numeric(19,6),
    survey_ton numeric(19,6),
    total_m3 numeric(19,6),
    total_tkm numeric(19,6),
    total_ton numeric(19,6),
    trip_count integer,
    report_period_id bigint NOT NULL,
    CONSTRAINT survey_coefficients_kind_check CHECK (((kind)::text = ANY ((ARRAY['AP_TDIA'::character varying, 'AP_TKM'::character varying])::text[])))
);


--
-- Name: survey_standard_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.survey_standard_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: survey_standards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.survey_standards (
    id bigint NOT NULL,
    catalog_type character varying(20) NOT NULL,
    coal_acceptance_product character varying(255),
    coal_bulk_density numeric(19,6),
    coal_design_volume numeric(19,6),
    coal_deviation numeric(19,6),
    coal_haul_distance numeric(19,6),
    coal_m3 numeric(19,6),
    coal_tkm numeric(19,6),
    coal_ton numeric(19,6),
    created_at timestamp(6) without time zone,
    earth_acceptance_product character varying(255),
    earth_bulk_density numeric(19,6),
    earth_design_volume numeric(19,6),
    earth_deviation numeric(19,6),
    earth_haul_distance numeric(19,6),
    earth_m3 numeric(19,6),
    earth_tkm numeric(19,6),
    earth_ton numeric(19,6),
    effective_from date NOT NULL,
    effective_to date NOT NULL,
    note text,
    seam_group_excavator_key character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    bench_group character varying(255),
    excavation_area character varying(255),
    excavator character varying(255),
    mud_mark character varying(255),
    seam_group character varying(255),
    suffix character varying(255),
    CONSTRAINT survey_standards_catalog_type_check CHECK (((catalog_type)::text = ANY ((ARRAY['DAT_CN'::character varying, 'DAT_SX_THAN_SX'::character varying])::text[])))
);


--
-- Name: transport_report_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_report_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_report_trip_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_report_trip_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_report_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_report_trips (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    load_level_custom_value character varying(255),
    load_level_type character varying(255) NOT NULL,
    local_slope_distance_km double precision,
    local_slope_m double precision,
    note text,
    rainy_day boolean NOT NULL,
    receiving_floor integer,
    receiving_floor_group integer,
    status character varying(30) NOT NULL,
    supplementary_vehicle boolean NOT NULL,
    total_route_distance_km double precision,
    total_route_lift_m double precision,
    trip_count integer,
    unloading_floor character varying(255),
    updated_at timestamp(6) without time zone,
    cargo_group_id bigint NOT NULL,
    cargo_type_id bigint NOT NULL,
    excavation_area_id bigint NOT NULL,
    excavator_device_id bigint NOT NULL,
    loading_point_id bigint NOT NULL,
    transport_report_id bigint NOT NULL,
    unloading_point_id bigint NOT NULL,
    ctnb_deviation_coefficient numeric(19,6),
    deduction_amount numeric(19,6),
    provisional_density numeric(19,6),
    provisional_model numeric(19,6),
    waste_rock_ton numeric(19,6),
    weighed_weight_ton numeric(19,6),
    CONSTRAINT transport_report_trips_load_level_type_check CHECK (((load_level_type)::text = ANY ((ARRAY['FULL_LOAD'::character varying, 'RODA_2_3'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT transport_report_trips_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REVISION_REQUESTED'::character varying])::text[])))
);


--
-- Name: transport_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_reports (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    fuel_beginning double precision,
    fuel_ending double precision,
    fuel_received double precision,
    fuel_used double precision,
    report_date date NOT NULL,
    updated_at timestamp(6) without time zone,
    employee_id bigint NOT NULL,
    shift_id bigint NOT NULL,
    vehicle_id bigint NOT NULL
);


--
-- Name: ttl_clh_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ttl_clh_items (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: ttl_clh_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ttl_clh_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unloading_point_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unloading_point_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unloading_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unloading_points (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: user_device_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_device_tokens (
    user_id bigint NOT NULL,
    device_token character varying(255)
);


--
-- Name: user_permission_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_permission_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id bigint NOT NULL,
    can_approve boolean NOT NULL,
    can_create boolean NOT NULL,
    can_delete boolean NOT NULL,
    can_read boolean NOT NULL,
    can_update boolean NOT NULL,
    resource character varying(255) NOT NULL,
    user_id bigint NOT NULL
);


--
-- Name: user_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    active boolean NOT NULL,
    avatar character varying(255),
    created_at timestamp(6) without time zone,
    email character varying(255),
    full_name character varying(255) NOT NULL,
    gender character varying(255),
    mongo_id character varying(255),
    password character varying(255) NOT NULL,
    password_changed_at timestamp(6) without time zone,
    phone character varying(255),
    role character varying(255) NOT NULL,
    salary_code character varying(255) NOT NULL,
    signature text,
    updated_at timestamp(6) without time zone,
    username character varying(255) NOT NULL,
    department_id bigint,
    position_id bigint,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['EMPLOYEE'::character varying, 'MANAGER'::character varying, 'ADMIN'::character varying])::text[])))
);


--
-- Name: vehicle_category_class_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_category_class_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_category_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_category_classes (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: vehicle_fuel_class_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_fuel_class_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_fuel_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_fuel_classes (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: vehicle_rank_group_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_rank_group_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_rank_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_rank_groups (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: vehicle_rank_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_rank_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_ranks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_ranks (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    note text,
    rank_order integer NOT NULL,
    updated_at timestamp(6) without time zone,
    vehicle_rank_group_id bigint NOT NULL
);


--
-- Name: vehicle_type_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_type_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_types (
    id bigint NOT NULL,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    note text,
    updated_at timestamp(6) without time zone
);


--
-- Name: acceptance_products acceptance_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acceptance_products
    ADD CONSTRAINT acceptance_products_pkey PRIMARY KEY (id);


--
-- Name: cargo_groups cargo_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo_groups
    ADD CONSTRAINT cargo_groups_pkey PRIMARY KEY (id);


--
-- Name: cargo_types cargo_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo_types
    ADD CONSTRAINT cargo_types_pkey PRIMARY KEY (id);


--
-- Name: classifications classifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classifications
    ADD CONSTRAINT classifications_pkey PRIMARY KEY (id);


--
-- Name: coefficient_items coefficient_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coefficient_items
    ADD CONSTRAINT coefficient_items_pkey PRIMARY KEY (id);


--
-- Name: density_parameters density_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.density_parameters
    ADD CONSTRAINT density_parameters_pkey PRIMARY KEY (id);


--
-- Name: department_resources department_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_resources
    ADD CONSTRAINT department_resources_pkey PRIMARY KEY (department_id, resource);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: device_models device_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_models
    ADD CONSTRAINT device_models_pkey PRIMARY KEY (id);


--
-- Name: device_types device_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_types
    ADD CONSTRAINT device_types_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: excavation_areas excavation_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_areas
    ADD CONSTRAINT excavation_areas_pkey PRIMARY KEY (id);


--
-- Name: excavation_report_trips excavation_report_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_report_trips
    ADD CONSTRAINT excavation_report_trips_pkey PRIMARY KEY (id);


--
-- Name: excavation_reports excavation_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_reports
    ADD CONSTRAINT excavation_reports_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: matrix_axis_entries matrix_axis_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_axis_entries
    ADD CONSTRAINT matrix_axis_entries_pkey PRIMARY KEY (id);


--
-- Name: matrix_cells matrix_cells_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_cells
    ADD CONSTRAINT matrix_cells_pkey PRIMARY KEY (id);


--
-- Name: matrix_definitions matrix_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_definitions
    ADD CONSTRAINT matrix_definitions_pkey PRIMARY KEY (id);


--
-- Name: model_period_values model_period_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_period_values
    ADD CONSTRAINT model_period_values_pkey PRIMARY KEY (id);


--
-- Name: model_periods model_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_periods
    ADD CONSTRAINT model_periods_pkey PRIMARY KEY (id);


--
-- Name: pickup_points pickup_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_points
    ADD CONSTRAINT pickup_points_pkey PRIMARY KEY (id);


--
-- Name: position_permissions position_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_permissions
    ADD CONSTRAINT position_permissions_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: production_results production_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_results
    ADD CONSTRAINT production_results_pkey PRIMARY KEY (id);


--
-- Name: receiving_points receiving_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_points
    ADD CONSTRAINT receiving_points_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_data_history reconciliation_data_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_data_history
    ADD CONSTRAINT reconciliation_data_history_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_decisions reconciliation_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_decisions
    ADD CONSTRAINT reconciliation_decisions_pkey PRIMARY KEY (id);


--
-- Name: report_period_audits report_period_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_period_audits
    ADD CONSTRAINT report_period_audits_pkey PRIMARY KEY (id);


--
-- Name: report_periods report_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_periods
    ADD CONSTRAINT report_periods_pkey PRIMARY KEY (id);


--
-- Name: seam_groups seam_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seam_groups
    ADD CONSTRAINT seam_groups_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: survey_coefficients survey_coefficients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_coefficients
    ADD CONSTRAINT survey_coefficients_pkey PRIMARY KEY (id);


--
-- Name: survey_standards survey_standards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_standards
    ADD CONSTRAINT survey_standards_pkey PRIMARY KEY (id);


--
-- Name: transport_report_trips transport_report_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT transport_report_trips_pkey PRIMARY KEY (id);


--
-- Name: transport_reports transport_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_reports
    ADD CONSTRAINT transport_reports_pkey PRIMARY KEY (id);


--
-- Name: ttl_clh_items ttl_clh_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttl_clh_items
    ADD CONSTRAINT ttl_clh_items_pkey PRIMARY KEY (id);


--
-- Name: users uk23i9df0vspvsaf6f1e58q6bgs; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk23i9df0vspvsaf6f1e58q6bgs UNIQUE (salary_code);


--
-- Name: positions uk4it9gglytrc2y0sg3rb9mv886; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT uk4it9gglytrc2y0sg3rb9mv886 UNIQUE (mongo_id);


--
-- Name: departments uk8xfbyde031yu5aljylgq1qkf8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT uk8xfbyde031yu5aljylgq1qkf8 UNIQUE (mongo_id);


--
-- Name: acceptance_products uk_acceptance_product_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acceptance_products
    ADD CONSTRAINT uk_acceptance_product_code UNIQUE (code);


--
-- Name: classifications uk_classification_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classifications
    ADD CONSTRAINT uk_classification_code UNIQUE (code);


--
-- Name: coefficient_items uk_coefficient_item_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coefficient_items
    ADD CONSTRAINT uk_coefficient_item_code UNIQUE (code);


--
-- Name: excavation_areas uk_excavation_area_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_areas
    ADD CONSTRAINT uk_excavation_area_code UNIQUE (code);


--
-- Name: excavation_reports uk_excavation_report_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_reports
    ADD CONSTRAINT uk_excavation_report_key UNIQUE (report_date, shift_id, excavator_device_id, employee_id);


--
-- Name: excavation_report_trips uk_excavation_trip_dedup; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_report_trips
    ADD CONSTRAINT uk_excavation_trip_dedup UNIQUE (excavation_report_id, vehicle_device_id, cargo_type_id, trip_count, load_level_type, load_level_custom_value);


--
-- Name: matrix_axis_entries uk_matrix_axis_entry; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_axis_entries
    ADD CONSTRAINT uk_matrix_axis_entry UNIQUE (definition_id, axis, entry_key);


--
-- Name: matrix_cells uk_matrix_cell; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_cells
    ADD CONSTRAINT uk_matrix_cell UNIQUE (definition_id, row_key, col_key);


--
-- Name: matrix_definitions uk_matrix_definition_code_from; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_definitions
    ADD CONSTRAINT uk_matrix_definition_code_from UNIQUE (code, effective_from);


--
-- Name: model_period_values uk_model_period_value; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_period_values
    ADD CONSTRAINT uk_model_period_value UNIQUE (model_period_id, vehicle_key);


--
-- Name: pickup_points uk_pickup_point_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_points
    ADD CONSTRAINT uk_pickup_point_code UNIQUE (code);


--
-- Name: position_permissions uk_position_permission_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_permissions
    ADD CONSTRAINT uk_position_permission_resource UNIQUE (position_id, resource);


--
-- Name: production_results uk_production_result_trip_period; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_results
    ADD CONSTRAINT uk_production_result_trip_period UNIQUE (report_period_id, transport_trip_id);


--
-- Name: receiving_points uk_receiving_point_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_points
    ADD CONSTRAINT uk_receiving_point_code UNIQUE (code);


--
-- Name: reconciliation_decisions uk_reconciliation_excavation_trip; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_decisions
    ADD CONSTRAINT uk_reconciliation_excavation_trip UNIQUE (excavation_report_trip_id);


--
-- Name: reconciliation_decisions uk_reconciliation_transport_trip; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_decisions
    ADD CONSTRAINT uk_reconciliation_transport_trip UNIQUE (transport_report_trip_id);


--
-- Name: report_periods uk_report_period_year_month_index; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_periods
    ADD CONSTRAINT uk_report_period_year_month_index UNIQUE (period_year, period_month, period_index);


--
-- Name: seam_groups uk_seam_group_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seam_groups
    ADD CONSTRAINT uk_seam_group_code UNIQUE (code);


--
-- Name: survey_coefficients uk_survey_coefficient; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_coefficients
    ADD CONSTRAINT uk_survey_coefficient UNIQUE (kind, report_period_id, seam_group_excavator_key, acceptance_product);


--
-- Name: transport_reports uk_transport_report_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_reports
    ADD CONSTRAINT uk_transport_report_key UNIQUE (report_date, shift_id, vehicle_id, employee_id);


--
-- Name: transport_report_trips uk_transport_trip_dedup; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT uk_transport_trip_dedup UNIQUE (transport_report_id, excavation_area_id, excavator_device_id, loading_point_id, unloading_point_id, cargo_type_id, trip_count, load_level_type, load_level_custom_value, rainy_day, supplementary_vehicle, receiving_floor, unloading_floor, total_route_distance_km, total_route_lift_m, local_slope_distance_km, local_slope_m);


--
-- Name: ttl_clh_items uk_ttl_clh_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ttl_clh_items
    ADD CONSTRAINT uk_ttl_clh_code UNIQUE (code);


--
-- Name: unloading_points uk_unloading_point_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unloading_points
    ADD CONSTRAINT uk_unloading_point_code UNIQUE (code);


--
-- Name: user_permissions uk_user_permission_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT uk_user_permission_resource UNIQUE (user_id, resource);


--
-- Name: vehicle_category_classes uk_vehicle_category_class_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_category_classes
    ADD CONSTRAINT uk_vehicle_category_class_code UNIQUE (code);


--
-- Name: vehicle_fuel_classes uk_vehicle_fuel_class_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_fuel_classes
    ADD CONSTRAINT uk_vehicle_fuel_class_code UNIQUE (code);


--
-- Name: vehicle_ranks uk_vehicle_rank_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_ranks
    ADD CONSTRAINT uk_vehicle_rank_code UNIQUE (code);


--
-- Name: vehicle_rank_groups uk_vehicle_rank_group_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_rank_groups
    ADD CONSTRAINT uk_vehicle_rank_group_code UNIQUE (code);


--
-- Name: vehicle_types uk_vehicle_type_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_types
    ADD CONSTRAINT uk_vehicle_type_code UNIQUE (code);


--
-- Name: users ukepk58oy1lcyg7gx7ghduaiew1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT ukepk58oy1lcyg7gx7ghduaiew1 UNIQUE (mongo_id);


--
-- Name: materials ukept8kyruheo5rr5fawghl1nfj; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT ukept8kyruheo5rr5fawghl1nfj UNIQUE (mongo_id);


--
-- Name: devices ukhh9a9oiwsj9aovaussccrvred; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT ukhh9a9oiwsj9aovaussccrvred UNIQUE (mongo_id);


--
-- Name: device_types ukia1xdyc2f21gxv8gn4vkndwn7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_types
    ADD CONSTRAINT ukia1xdyc2f21gxv8gn4vkndwn7 UNIQUE (mongo_id);


--
-- Name: departments ukj6cwks7xecs5jov19ro8ge3qk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT ukj6cwks7xecs5jov19ro8ge3qk UNIQUE (name);


--
-- Name: shifts ukkub5lvm3ppih5ot9vlafptrsr; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT ukkub5lvm3ppih5ot9vlafptrsr UNIQUE (mongo_id);


--
-- Name: departments ukl7tivi5261wxdnvo6cct9gg6t; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT ukl7tivi5261wxdnvo6cct9gg6t UNIQUE (code);


--
-- Name: locations ukn0pcr6ry7xcjjgtcx1s9a7sa4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT ukn0pcr6ry7xcjjgtcx1s9a7sa4 UNIQUE (mongo_id);


--
-- Name: device_models ukow99ohay29u1yvw6b9a8kbu8e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_models
    ADD CONSTRAINT ukow99ohay29u1yvw6b9a8kbu8e UNIQUE (mongo_id);


--
-- Name: users ukr43af9ap4edm43mmtq01oddj6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT ukr43af9ap4edm43mmtq01oddj6 UNIQUE (username);


--
-- Name: unloading_points unloading_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unloading_points
    ADD CONSTRAINT unloading_points_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_category_classes vehicle_category_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_category_classes
    ADD CONSTRAINT vehicle_category_classes_pkey PRIMARY KEY (id);


--
-- Name: vehicle_fuel_classes vehicle_fuel_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_fuel_classes
    ADD CONSTRAINT vehicle_fuel_classes_pkey PRIMARY KEY (id);


--
-- Name: vehicle_rank_groups vehicle_rank_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_rank_groups
    ADD CONSTRAINT vehicle_rank_groups_pkey PRIMARY KEY (id);


--
-- Name: vehicle_ranks vehicle_ranks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_ranks
    ADD CONSTRAINT vehicle_ranks_pkey PRIMARY KEY (id);


--
-- Name: vehicle_types vehicle_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_types
    ADD CONSTRAINT vehicle_types_pkey PRIMARY KEY (id);


--
-- Name: idx_cargo_type_cargo_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cargo_type_cargo_group ON public.cargo_types USING btree (cargo_group_id);


--
-- Name: idx_device_category_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_category_status ON public.devices USING btree (category_id, status);


--
-- Name: idx_device_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_department ON public.devices USING btree (department_id);


--
-- Name: ix_density_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_density_lookup ON public.density_parameters USING btree (cargo_type_id, excavation_area_id, effective_from, effective_to);


--
-- Name: ix_matrix_cell_definition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matrix_cell_definition ON public.matrix_cells USING btree (definition_id);


--
-- Name: ix_model_period_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_model_period_lookup ON public.model_periods USING btree (cargo_type_id, effective_from, effective_to);


--
-- Name: ix_model_period_value_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_model_period_value_period ON public.model_period_values USING btree (model_period_id);


--
-- Name: ix_production_result_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_production_result_key ON public.production_results USING btree (seam_group_excavator_key);


--
-- Name: ix_production_result_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_production_result_period ON public.production_results USING btree (report_period_id);


--
-- Name: ix_survey_coefficient_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_survey_coefficient_lookup ON public.survey_coefficients USING btree (kind, report_period_id, seam_group_excavator_key);


--
-- Name: ix_survey_standard_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_survey_standard_lookup ON public.survey_standards USING btree (catalog_type, seam_group_excavator_key, effective_from, effective_to);


--
-- Name: production_results fk1dkdwo29xca8y3wvpui8ddf54; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_results
    ADD CONSTRAINT fk1dkdwo29xca8y3wvpui8ddf54 FOREIGN KEY (report_period_id) REFERENCES public.report_periods(id);


--
-- Name: transport_report_trips fk1mwllx00rs9c6bkgil4ta3blc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fk1mwllx00rs9c6bkgil4ta3blc FOREIGN KEY (cargo_group_id) REFERENCES public.cargo_groups(id);


--
-- Name: receiving_points fk1tjj0pm5emfqjidss4dwmhn2h; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receiving_points
    ADD CONSTRAINT fk1tjj0pm5emfqjidss4dwmhn2h FOREIGN KEY (seam_group_id) REFERENCES public.seam_groups(id);


--
-- Name: transport_report_trips fk1v06larx4dfqu4xmjbc7ph8p0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fk1v06larx4dfqu4xmjbc7ph8p0 FOREIGN KEY (transport_report_id) REFERENCES public.transport_reports(id);


--
-- Name: excavation_reports fk2lbqcrxtumx54lb5ijmxtlv18; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_reports
    ADD CONSTRAINT fk2lbqcrxtumx54lb5ijmxtlv18 FOREIGN KEY (excavator_device_id) REFERENCES public.devices(id);


--
-- Name: excavation_reports fk2xragegwik0gp17vpiejfnq5l; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_reports
    ADD CONSTRAINT fk2xragegwik0gp17vpiejfnq5l FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: excavation_report_trips fk3clweeap0jto0uu8is74waxmp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_report_trips
    ADD CONSTRAINT fk3clweeap0jto0uu8is74waxmp FOREIGN KEY (excavation_report_id) REFERENCES public.excavation_reports(id);


--
-- Name: transport_reports fk3ul503e7sqdtewsuqmur8to7i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_reports
    ADD CONSTRAINT fk3ul503e7sqdtewsuqmur8to7i FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: devices fk4klixlmowu1rlmoh8i40g3k0q; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk4klixlmowu1rlmoh8i40g3k0q FOREIGN KEY (vehicle_type_id) REFERENCES public.vehicle_types(id);


--
-- Name: devices fk57owuc1wpqhcjlpq12xh9n8vy; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk57owuc1wpqhcjlpq12xh9n8vy FOREIGN KEY (material_id) REFERENCES public.device_models(id);


--
-- Name: vehicle_ranks fk69vjqsgol3psr8ghiwq772a9f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_ranks
    ADD CONSTRAINT fk69vjqsgol3psr8ghiwq772a9f FOREIGN KEY (vehicle_rank_group_id) REFERENCES public.vehicle_rank_groups(id);


--
-- Name: production_results fk6c6y1eq2lriac5s4usmqel9ww; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_results
    ADD CONSTRAINT fk6c6y1eq2lriac5s4usmqel9ww FOREIGN KEY (transport_trip_id) REFERENCES public.transport_report_trips(id);


--
-- Name: users fk6ph6xiiydudp6umjf2xckbbmi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk6ph6xiiydudp6umjf2xckbbmi FOREIGN KEY (position_id) REFERENCES public.positions(id);


--
-- Name: reconciliation_decisions fk6qwy8oeoo5pw2dnkk6k99pdj2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_decisions
    ADD CONSTRAINT fk6qwy8oeoo5pw2dnkk6k99pdj2 FOREIGN KEY (transport_report_trip_id) REFERENCES public.transport_report_trips(id);


--
-- Name: devices fk71ca3e6omc1wo9ioksihkglmh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fk71ca3e6omc1wo9ioksihkglmh FOREIGN KEY (vehicle_rank_id) REFERENCES public.vehicle_ranks(id);


--
-- Name: excavation_reports fk7ks76eaux6l8c4yiu996vtq0e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_reports
    ADD CONSTRAINT fk7ks76eaux6l8c4yiu996vtq0e FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: positions fk7lkgjivwf8cd9o6s4h0ule242; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT fk7lkgjivwf8cd9o6s4h0ule242 FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: density_parameters fk9yfdq38ih38kxkhie30fhmca9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.density_parameters
    ADD CONSTRAINT fk9yfdq38ih38kxkhie30fhmca9 FOREIGN KEY (excavation_area_id) REFERENCES public.excavation_areas(id);


--
-- Name: excavation_reports fk_report_pickup_point; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_reports
    ADD CONSTRAINT fk_report_pickup_point FOREIGN KEY (receiving_location_id) REFERENCES public.pickup_points(id);


--
-- Name: model_period_values fkaidxl6o0kdlj1brsxnu3jolir; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_period_values
    ADD CONSTRAINT fkaidxl6o0kdlj1brsxnu3jolir FOREIGN KEY (model_period_id) REFERENCES public.model_periods(id);


--
-- Name: material_value_history fkatmuic47gev2tf2vsgsf94y5e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_value_history
    ADD CONSTRAINT fkatmuic47gev2tf2vsgsf94y5e FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: device_files fkaymwk950qjvgdj4sju4k86mnn; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_files
    ADD CONSTRAINT fkaymwk950qjvgdj4sju4k86mnn FOREIGN KEY (device_id) REFERENCES public.devices(id);


--
-- Name: devices fkb1a043ndcjr6mggsahjww8ajk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fkb1a043ndcjr6mggsahjww8ajk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: reconciliation_decisions fked5rbu5vti3et5p8cnwabug4l; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_decisions
    ADD CONSTRAINT fked5rbu5vti3et5p8cnwabug4l FOREIGN KEY (excavation_report_trip_id) REFERENCES public.excavation_report_trips(id);


--
-- Name: devices fket6hkpr8sg7iiydf4gxejh6gi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fket6hkpr8sg7iiydf4gxejh6gi FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: user_device_tokens fkevk16cemgy1bwx5s0d6oa8x41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_device_tokens
    ADD CONSTRAINT fkevk16cemgy1bwx5s0d6oa8x41 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: position_permissions fkflpalfxe9ytt1wy5gy0fvyinb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.position_permissions
    ADD CONSTRAINT fkflpalfxe9ytt1wy5gy0fvyinb FOREIGN KEY (position_id) REFERENCES public.positions(id);


--
-- Name: transport_report_trips fkgba93ixv71ocq38h1r8daokne; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fkgba93ixv71ocq38h1r8daokne FOREIGN KEY (loading_point_id) REFERENCES public.receiving_points(id);


--
-- Name: cargo_types fkgcjsr3oac0hjpbd7dig9uv3th; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo_types
    ADD CONSTRAINT fkgcjsr3oac0hjpbd7dig9uv3th FOREIGN KEY (cargo_group_id) REFERENCES public.cargo_groups(id);


--
-- Name: cargo_types fkgrss9yhbhvgi713wms91l1ktx; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo_types
    ADD CONSTRAINT fkgrss9yhbhvgi713wms91l1ktx FOREIGN KEY (ttl_clh_id) REFERENCES public.ttl_clh_items(id);


--
-- Name: survey_coefficients fkgx8l8g6bcmee6qsmn3j29dc3j; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.survey_coefficients
    ADD CONSTRAINT fkgx8l8g6bcmee6qsmn3j29dc3j FOREIGN KEY (report_period_id) REFERENCES public.report_periods(id);


--
-- Name: model_periods fkhnsi2yyb5ghgn2bos2c26dtd2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_periods
    ADD CONSTRAINT fkhnsi2yyb5ghgn2bos2c26dtd2 FOREIGN KEY (cargo_type_id) REFERENCES public.cargo_types(id);


--
-- Name: transport_report_trips fki0wkjc13gcoisa2ggy3tqg0o3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fki0wkjc13gcoisa2ggy3tqg0o3 FOREIGN KEY (unloading_point_id) REFERENCES public.unloading_points(id);


--
-- Name: department_resources fkicqvv4e7c1rsw23uefy7rl8ux; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_resources
    ADD CONSTRAINT fkicqvv4e7c1rsw23uefy7rl8ux FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: transport_report_trips fkjfsngsrlryhvw03do0do5gcub; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fkjfsngsrlryhvw03do0do5gcub FOREIGN KEY (excavation_area_id) REFERENCES public.excavation_areas(id);


--
-- Name: cargo_types fkjne42kgpoa67g0nkpxeojekw0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo_types
    ADD CONSTRAINT fkjne42kgpoa67g0nkpxeojekw0 FOREIGN KEY (acceptance_product_id) REFERENCES public.acceptance_products(id);


--
-- Name: user_permissions fkkowxl8b2bngrxd1gafh13005u; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT fkkowxl8b2bngrxd1gafh13005u FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transport_reports fkkrqy8n8gsvgkhe69ntoumrley; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_reports
    ADD CONSTRAINT fkkrqy8n8gsvgkhe69ntoumrley FOREIGN KEY (vehicle_id) REFERENCES public.devices(id);


--
-- Name: excavation_report_trips fkl8rxirmcxmfdyxgjm73pmqwtw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_report_trips
    ADD CONSTRAINT fkl8rxirmcxmfdyxgjm73pmqwtw FOREIGN KEY (vehicle_device_id) REFERENCES public.devices(id);


--
-- Name: excavation_report_trips fklemub307cmb9v3jqgn5isr1ja; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_report_trips
    ADD CONSTRAINT fklemub307cmb9v3jqgn5isr1ja FOREIGN KEY (cargo_group_id) REFERENCES public.cargo_groups(id);


--
-- Name: reconciliation_data_history fkljstr7kryk346bb32ynsmjwlf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_data_history
    ADD CONSTRAINT fkljstr7kryk346bb32ynsmjwlf FOREIGN KEY (reconciliation_decision_id) REFERENCES public.reconciliation_decisions(id);


--
-- Name: matrix_axis_entries fklovbw6xe15gdmckrts1qtuysv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_axis_entries
    ADD CONSTRAINT fklovbw6xe15gdmckrts1qtuysv FOREIGN KEY (definition_id) REFERENCES public.matrix_definitions(id);


--
-- Name: transport_report_trips fkm2j470mkdjgfy9r05mrhbe5d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fkm2j470mkdjgfy9r05mrhbe5d FOREIGN KEY (excavator_device_id) REFERENCES public.devices(id);


--
-- Name: matrix_cells fkmeu6nnejnq4pavau0om5jechh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matrix_cells
    ADD CONSTRAINT fkmeu6nnejnq4pavau0om5jechh FOREIGN KEY (definition_id) REFERENCES public.matrix_definitions(id);


--
-- Name: devices fkms42i0of96gs3um2sahya2x3x; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fkms42i0of96gs3um2sahya2x3x FOREIGN KEY (fuel_class_id) REFERENCES public.vehicle_fuel_classes(id);


--
-- Name: devices fknrxv05rdwbbna2vsxyb0dpo2i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fknrxv05rdwbbna2vsxyb0dpo2i FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: transport_report_trips fko4h1t7siolcdsavryot8894wu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_report_trips
    ADD CONSTRAINT fko4h1t7siolcdsavryot8894wu FOREIGN KEY (cargo_type_id) REFERENCES public.cargo_types(id);


--
-- Name: excavation_report_trips fko6vo5xthsuc7o9yv9p3ii95m9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excavation_report_trips
    ADD CONSTRAINT fko6vo5xthsuc7o9yv9p3ii95m9 FOREIGN KEY (cargo_type_id) REFERENCES public.cargo_types(id);


--
-- Name: transport_reports fkpvo0bc0iwotnw4t8ysqpwpd5e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_reports
    ADD CONSTRAINT fkpvo0bc0iwotnw4t8ysqpwpd5e FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: density_parameters fkrx1welokxy6tnheivr1c5radt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.density_parameters
    ADD CONSTRAINT fkrx1welokxy6tnheivr1c5radt FOREIGN KEY (cargo_type_id) REFERENCES public.cargo_types(id);


--
-- Name: users fksbg59w8q63i0oo53rlgvlcnjq; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fksbg59w8q63i0oo53rlgvlcnjq FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: report_period_audits fksbnn3ni3xd1ian4kp5y2y57t; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_period_audits
    ADD CONSTRAINT fksbnn3ni3xd1ian4kp5y2y57t FOREIGN KEY (report_period_id) REFERENCES public.report_periods(id);


--
-- Name: devices fksdhdwr3u5jov4snua092xsk4e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fksdhdwr3u5jov4snua092xsk4e FOREIGN KEY (category_class_id) REFERENCES public.vehicle_category_classes(id);


--
-- Name: devices fksdhu03g6rd9c2qdtdr46byx93; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT fksdhu03g6rd9c2qdtdr46byx93 FOREIGN KEY (category_id) REFERENCES public.device_types(id);


--
-- PostgreSQL database dump complete
--


