
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO


IF DB_ID(N'BloodDonationDB') IS NULL
BEGIN
    CREATE DATABASE BloodDonationDB COLLATE Vietnamese_CI_AS;
END
GO

USE BloodDonationDB;
GO

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'DROP PROCEDURE ' + QUOTENAME(OBJECT_SCHEMA_NAME(object_id)) + N'.' + QUOTENAME(name) + N';'
FROM sys.procedures WHERE is_ms_shipped = 0;

SELECT @sql = @sql + N'DROP VIEW ' + QUOTENAME(OBJECT_SCHEMA_NAME(object_id)) + N'.' + QUOTENAME(name) + N';'
FROM sys.views WHERE is_ms_shipped = 0;

SELECT @sql = @sql + N'DROP FUNCTION ' + QUOTENAME(OBJECT_SCHEMA_NAME(object_id)) + N'.' + QUOTENAME(name) + N';'
FROM sys.objects WHERE type IN (N'FN', N'IF', N'TF') AND is_ms_shipped = 0;

SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id))
    + N' DROP CONSTRAINT ' + QUOTENAME(name) + N';'
FROM sys.foreign_keys;

SELECT @sql = @sql + N'DROP TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';'
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0;

IF LEN(@sql) > 0
    EXEC sp_executesql @sql;
GO

/* =============================================================================
   DANH MỤC / THAM CHIẾU
   ============================================================================= */

CREATE TABLE dbo.roles (
    role_id         INT             NOT NULL IDENTITY(1,1),
    role_code       NVARCHAR(20)    NOT NULL,
    role_name       NVARCHAR(100)   NOT NULL,
    description     NVARCHAR(500)   NULL,
    is_active       BIT             NOT NULL CONSTRAINT df_roles_is_active DEFAULT (1),
    created_at      DATETIME2(0)    NOT NULL CONSTRAINT df_roles_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_roles PRIMARY KEY (role_id),
    CONSTRAINT uq_roles_role_code UNIQUE (role_code)
);

CREATE TABLE dbo.blood_types (
    blood_type_id   INT             NOT NULL IDENTITY(1,1),
    blood_type_code NVARCHAR(5)     NOT NULL,
    abo             CHAR(2)         NOT NULL,
    rh_factor       CHAR(1)         NOT NULL,
    display_order   INT             NOT NULL CONSTRAINT df_blood_types_display_order DEFAULT (0),
    is_active       BIT             NOT NULL CONSTRAINT df_blood_types_is_active DEFAULT (1),
    CONSTRAINT pk_blood_types PRIMARY KEY (blood_type_id),
    CONSTRAINT uq_blood_types_code UNIQUE (blood_type_code),
    CONSTRAINT ck_blood_types_abo CHECK (abo IN ('A','B','AB','O')),
    CONSTRAINT ck_blood_types_rh CHECK (rh_factor IN ('+','-'))
);

CREATE TABLE dbo.blood_components (
    component_id    INT             NOT NULL IDENTITY(1,1),
    component_code  NVARCHAR(30)    NOT NULL,
    component_name  NVARCHAR(100)   NOT NULL,
    description     NVARCHAR(500)   NULL,
    is_active       BIT             NOT NULL CONSTRAINT df_blood_components_is_active DEFAULT (1),
    CONSTRAINT pk_blood_components PRIMARY KEY (component_id),
    CONSTRAINT uq_blood_components_code UNIQUE (component_code)
);

CREATE TABLE dbo.blood_compatibility (
    compatibility_id        INT NOT NULL IDENTITY(1,1),
    component_id            INT NOT NULL,
    donor_blood_type_id     INT NOT NULL,
    recipient_blood_type_id INT NOT NULL,
    is_compatible           BIT NOT NULL CONSTRAINT df_blood_compatibility_is_compatible DEFAULT (1),
    notes                   NVARCHAR(300) NULL,
    CONSTRAINT pk_blood_compatibility PRIMARY KEY (compatibility_id),
    CONSTRAINT fk_blood_compatibility_component FOREIGN KEY (component_id) REFERENCES dbo.blood_components(component_id),
    CONSTRAINT fk_blood_compatibility_donor FOREIGN KEY (donor_blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT fk_blood_compatibility_recipient FOREIGN KEY (recipient_blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT uq_blood_compatibility UNIQUE (component_id, donor_blood_type_id, recipient_blood_type_id)
);

CREATE TABLE dbo.donation_interval_rules (
    rule_id                 INT NOT NULL IDENTITY(1,1),
    component_id            INT NOT NULL,
    min_interval_days       INT NOT NULL,
    max_donations_per_year  INT NULL,
    description             NVARCHAR(300) NULL,
    is_active               BIT NOT NULL CONSTRAINT df_donation_interval_rules_is_active DEFAULT (1),
    CONSTRAINT pk_donation_interval_rules PRIMARY KEY (rule_id),
    CONSTRAINT fk_donation_interval_rules_component FOREIGN KEY (component_id) REFERENCES dbo.blood_components(component_id),
    CONSTRAINT uq_donation_interval_rules_component UNIQUE (component_id),
    CONSTRAINT ck_donation_interval_rules_days CHECK (min_interval_days > 0)
);

CREATE TABLE dbo.blood_request_statuses (
    status_id       INT NOT NULL IDENTITY(1,1),
    status_code     NVARCHAR(30) NOT NULL,
    status_name     NVARCHAR(100) NOT NULL,
    description     NVARCHAR(500) NULL,
    sort_order      INT NOT NULL CONSTRAINT df_blood_request_statuses_sort_order DEFAULT (0),
    is_terminal     BIT NOT NULL CONSTRAINT df_blood_request_statuses_is_terminal DEFAULT (0),
    CONSTRAINT pk_blood_request_statuses PRIMARY KEY (status_id),
    CONSTRAINT uq_blood_request_statuses_code UNIQUE (status_code)
);

CREATE TABLE dbo.urgency_levels (
    urgency_id      INT NOT NULL IDENTITY(1,1),
    urgency_code    NVARCHAR(20) NOT NULL,
    urgency_name    NVARCHAR(100) NOT NULL,
    priority_level  INT NOT NULL,
    CONSTRAINT pk_urgency_levels PRIMARY KEY (urgency_id),
    CONSTRAINT uq_urgency_levels_code UNIQUE (urgency_code)
);

CREATE TABLE dbo.provinces (
    province_id     INT NOT NULL IDENTITY(1,1),
    province_code   NVARCHAR(10) NULL,
    province_name   NVARCHAR(100) NOT NULL,
    CONSTRAINT pk_provinces PRIMARY KEY (province_id)
);

CREATE TABLE dbo.districts (
    district_id     INT NOT NULL IDENTITY(1,1),
    province_id     INT NOT NULL,
    district_name   NVARCHAR(100) NOT NULL,
    CONSTRAINT pk_districts PRIMARY KEY (district_id),
    CONSTRAINT fk_districts_province FOREIGN KEY (province_id) REFERENCES dbo.provinces(province_id)
);

CREATE TABLE dbo.wards (
    ward_id         INT NOT NULL IDENTITY(1,1),
    district_id     INT NOT NULL,
    ward_name       NVARCHAR(100) NOT NULL,
    CONSTRAINT pk_wards PRIMARY KEY (ward_id),
    CONSTRAINT fk_wards_district FOREIGN KEY (district_id) REFERENCES dbo.districts(district_id)
);

/* =============================================================================
   CƠ SỞ Y TẾ & CMS
   ============================================================================= */

CREATE TABLE dbo.medical_facilities (
    facility_id     INT NOT NULL IDENTITY(1,1),
    facility_code   NVARCHAR(20) NOT NULL,
    facility_name   NVARCHAR(200) NOT NULL,
    short_name      NVARCHAR(100) NULL,
    address         NVARCHAR(500) NOT NULL,
    province_id     INT NULL,
    district_id     INT NULL,
    ward_id         INT NULL,
    phone           NVARCHAR(20) NULL,
    email           NVARCHAR(100) NULL,
    website         NVARCHAR(200) NULL,
    latitude        DECIMAL(10,7) NULL,
    longitude       DECIMAL(10,7) NULL,
    logo_url        NVARCHAR(500) NULL,
    is_primary      BIT NOT NULL CONSTRAINT df_medical_facilities_is_primary DEFAULT (0),
    is_active       BIT NOT NULL CONSTRAINT df_medical_facilities_is_active DEFAULT (1),
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_medical_facilities_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2(0) NULL,
    CONSTRAINT pk_medical_facilities PRIMARY KEY (facility_id),
    CONSTRAINT uq_medical_facilities_code UNIQUE (facility_code),
    CONSTRAINT fk_medical_facilities_province FOREIGN KEY (province_id) REFERENCES dbo.provinces(province_id),
    CONSTRAINT fk_medical_facilities_district FOREIGN KEY (district_id) REFERENCES dbo.districts(district_id),
    CONSTRAINT fk_medical_facilities_ward FOREIGN KEY (ward_id) REFERENCES dbo.wards(ward_id)
);

CREATE TABLE dbo.education_document_categories (
    category_id     INT NOT NULL IDENTITY(1,1),
    category_name   NVARCHAR(150) NOT NULL,
    description     NVARCHAR(500) NULL,
    sort_order      INT NOT NULL CONSTRAINT df_education_document_categories_sort_order DEFAULT (0),
    CONSTRAINT pk_education_document_categories PRIMARY KEY (category_id)
);

CREATE TABLE dbo.education_documents (
    document_id     INT NOT NULL IDENTITY(1,1),
    category_id     INT NOT NULL,
    blood_type_id   INT NULL,
    title           NVARCHAR(300) NOT NULL,
    slug            NVARCHAR(300) NOT NULL,
    summary         NVARCHAR(1000) NULL,
    content_html    NVARCHAR(MAX) NOT NULL,
    thumbnail_url   NVARCHAR(500) NULL,
    view_count      INT NOT NULL CONSTRAINT df_education_documents_view_count DEFAULT (0),
    is_published    BIT NOT NULL CONSTRAINT df_education_documents_is_published DEFAULT (1),
    published_at    DATETIME2(0) NULL,
    created_by      INT NULL,
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_education_documents_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2(0) NULL,
    CONSTRAINT pk_education_documents PRIMARY KEY (document_id),
    CONSTRAINT fk_education_documents_category FOREIGN KEY (category_id) REFERENCES dbo.education_document_categories(category_id),
    CONSTRAINT fk_education_documents_blood_type FOREIGN KEY (blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT uq_education_documents_slug UNIQUE (slug)
);

CREATE TABLE dbo.blog_categories (
    blog_category_id INT NOT NULL IDENTITY(1,1),
    category_name   NVARCHAR(150) NOT NULL,
    slug            NVARCHAR(150) NOT NULL,
    CONSTRAINT pk_blog_categories PRIMARY KEY (blog_category_id),
    CONSTRAINT uq_blog_categories_slug UNIQUE (slug)
);

CREATE TABLE dbo.blog_posts (
    post_id         INT NOT NULL IDENTITY(1,1),
    blog_category_id INT NOT NULL,
    author_user_id  INT NULL,
    title           NVARCHAR(300) NOT NULL,
    slug            NVARCHAR(300) NOT NULL,
    summary         NVARCHAR(1000) NULL,
    content_html    NVARCHAR(MAX) NOT NULL,
    thumbnail_url   NVARCHAR(500) NULL,
    view_count      INT NOT NULL CONSTRAINT df_blog_posts_view_count DEFAULT (0),
    is_published    BIT NOT NULL CONSTRAINT df_blog_posts_is_published DEFAULT (0),
    published_at    DATETIME2(0) NULL,
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_blog_posts_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2(0) NULL,
    CONSTRAINT pk_blog_posts PRIMARY KEY (post_id),
    CONSTRAINT fk_blog_posts_category FOREIGN KEY (blog_category_id) REFERENCES dbo.blog_categories(blog_category_id),
    CONSTRAINT uq_blog_posts_slug UNIQUE (slug)
);

CREATE TABLE dbo.blog_comments (
    comment_id          INT NOT NULL IDENTITY(1,1),
    post_id             INT NOT NULL,
    parent_comment_id   INT NULL,
    user_id             INT NULL,
    reply_to_user_id    INT NULL,
    guest_name          NVARCHAR(100) NULL,
    content             NVARCHAR(2000) NOT NULL,
    is_approved         BIT NOT NULL CONSTRAINT df_blog_comments_is_approved DEFAULT (0),
    created_at          DATETIME2(0) NOT NULL CONSTRAINT df_blog_comments_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at          DATETIME2(0) NULL,
    CONSTRAINT pk_blog_comments PRIMARY KEY (comment_id),
    CONSTRAINT fk_blog_comments_post FOREIGN KEY (post_id) REFERENCES dbo.blog_posts(post_id),
    CONSTRAINT fk_blog_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES dbo.blog_comments(comment_id)
);

/* =============================================================================
   NGƯỜI DÙNG & HIẾN MÁU
   ============================================================================= */

CREATE TABLE dbo.users (
    user_id                     INT NOT NULL IDENTITY(1,1),
    role_id                     INT NOT NULL,
    email                       NVARCHAR(150) NOT NULL,
    password_hash               NVARCHAR(256) NOT NULL,
    full_name                   NVARCHAR(150) NOT NULL,
    phone                       NVARCHAR(20) NULL,
    date_of_birth               DATE NULL,
    gender                      CHAR(1) NULL,
    avatar_url                  NVARCHAR(500) NULL,
    address                     NVARCHAR(500) NULL,
    province_id                 INT NULL,
    district_id                 INT NULL,
    ward_id                     INT NULL,
    latitude                    DECIMAL(10,7) NULL,
    longitude                   DECIMAL(10,7) NULL,
    blood_type_id               INT NULL,
    is_donor_registered         BIT NOT NULL CONSTRAINT df_users_is_donor_registered DEFAULT (0),
    is_available_for_donation   BIT NOT NULL CONSTRAINT df_users_is_available_for_donation DEFAULT (0),
    last_login_at               DATETIME2(0) NULL,
    is_active                   BIT NOT NULL CONSTRAINT df_users_is_active DEFAULT (1),
    is_email_verified           BIT NOT NULL CONSTRAINT df_users_is_email_verified DEFAULT (0),
    created_at                  DATETIME2(0) NOT NULL CONSTRAINT df_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at                  DATETIME2(0) NULL,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id),
    CONSTRAINT fk_users_blood_type FOREIGN KEY (blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT fk_users_province FOREIGN KEY (province_id) REFERENCES dbo.provinces(province_id),
    CONSTRAINT fk_users_district FOREIGN KEY (district_id) REFERENCES dbo.districts(district_id),
    CONSTRAINT fk_users_ward FOREIGN KEY (ward_id) REFERENCES dbo.wards(ward_id),
    CONSTRAINT ck_users_gender CHECK (gender IS NULL OR gender IN ('M','F','O'))
);

CREATE TABLE dbo.donor_profiles (
    donor_profile_id        INT NOT NULL IDENTITY(1,1),
    user_id                 INT NOT NULL,
    blood_type_id           INT NOT NULL,
    weight_kg               DECIMAL(5,2) NULL,
    height_cm               INT NULL,
    first_donation_date     DATE NULL,
    total_donations         INT NOT NULL CONSTRAINT df_donor_profiles_total_donations DEFAULT (0),
    last_donation_date      DATE NULL,
    next_eligible_date      DATE NULL,
    health_notes            NVARCHAR(1000) NULL,
    emergency_contact_name  NVARCHAR(150) NULL,
    emergency_contact_phone NVARCHAR(20) NULL,
    is_active               BIT NOT NULL CONSTRAINT df_donor_profiles_is_active DEFAULT (1),
    created_at              DATETIME2(0) NOT NULL CONSTRAINT df_donor_profiles_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at              DATETIME2(0) NULL,
    CONSTRAINT pk_donor_profiles PRIMARY KEY (donor_profile_id),
    CONSTRAINT fk_donor_profiles_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT fk_donor_profiles_blood_type FOREIGN KEY (blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT uq_donor_profiles_user UNIQUE (user_id)
);

CREATE TABLE dbo.donor_availability_slots (
    slot_id         INT NOT NULL IDENTITY(1,1),
    user_id         INT NOT NULL,
    day_of_week     TINYINT NULL,
    specific_date   DATE NULL,
    start_time      TIME(0) NOT NULL,
    end_time        TIME(0) NOT NULL,
    notes           NVARCHAR(300) NULL,
    is_recurring    BIT NOT NULL CONSTRAINT df_donor_availability_slots_is_recurring DEFAULT (1),
    is_active       BIT NOT NULL CONSTRAINT df_donor_availability_slots_is_active DEFAULT (1),
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_donor_availability_slots_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_donor_availability_slots PRIMARY KEY (slot_id),
    CONSTRAINT fk_donor_availability_slots_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT ck_donor_availability_slots_time CHECK (end_time > start_time)
);

ALTER TABLE dbo.education_documents
    ADD CONSTRAINT fk_education_documents_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(user_id);
ALTER TABLE dbo.blog_posts
    ADD CONSTRAINT fk_blog_posts_author FOREIGN KEY (author_user_id) REFERENCES dbo.users(user_id);
ALTER TABLE dbo.blog_comments
    ADD CONSTRAINT fk_blog_comments_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id);
ALTER TABLE dbo.blog_comments
    ADD CONSTRAINT fk_blog_comments_reply_to_user FOREIGN KEY (reply_to_user_id) REFERENCES dbo.users(user_id);

/* =============================================================================
   KHO MÁU
   ============================================================================= */

CREATE TABLE dbo.blood_inventory (
    inventory_id        INT NOT NULL IDENTITY(1,1),
    facility_id         INT NOT NULL,
    blood_type_id       INT NOT NULL,
    component_id        INT NOT NULL,
    bag_code            NVARCHAR(50) NOT NULL,
    volume_ml           INT NOT NULL,
    collection_date     DATE NOT NULL,
    expiry_date         DATE NOT NULL,
    status_code         NVARCHAR(20) NOT NULL CONSTRAINT df_blood_inventory_status_code DEFAULT ('AVAILABLE'),
    source_donation_id  INT NULL,
    notes               NVARCHAR(500) NULL,
    created_at          DATETIME2(0) NOT NULL CONSTRAINT df_blood_inventory_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at          DATETIME2(0) NULL,
    CONSTRAINT pk_blood_inventory PRIMARY KEY (inventory_id),
    CONSTRAINT fk_blood_inventory_facility FOREIGN KEY (facility_id) REFERENCES dbo.medical_facilities(facility_id),
    CONSTRAINT fk_blood_inventory_blood_type FOREIGN KEY (blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT fk_blood_inventory_component FOREIGN KEY (component_id) REFERENCES dbo.blood_components(component_id),
    CONSTRAINT uq_blood_inventory_bag_code UNIQUE (bag_code),
    CONSTRAINT ck_blood_inventory_volume CHECK (volume_ml > 0),
    CONSTRAINT ck_blood_inventory_status CHECK (status_code IN ('AVAILABLE','RESERVED','USED','EXPIRED','DISCARDED'))
);

CREATE TABLE dbo.inventory_transactions (
    transaction_id      INT NOT NULL IDENTITY(1,1),
    inventory_id        INT NOT NULL,
    transaction_type    NVARCHAR(20) NOT NULL,
    quantity            INT NOT NULL CONSTRAINT df_inventory_transactions_quantity DEFAULT (1),
    reference_type      NVARCHAR(50) NULL,
    reference_id        INT NULL,
    performed_by        INT NULL,
    notes               NVARCHAR(500) NULL,
    created_at          DATETIME2(0) NOT NULL CONSTRAINT df_inventory_transactions_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_inventory_transactions PRIMARY KEY (transaction_id),
    CONSTRAINT fk_inventory_transactions_inventory FOREIGN KEY (inventory_id) REFERENCES dbo.blood_inventory(inventory_id),
    CONSTRAINT fk_inventory_transactions_user FOREIGN KEY (performed_by) REFERENCES dbo.users(user_id),
    CONSTRAINT ck_inventory_transactions_type CHECK (transaction_type IN ('IN','OUT','RESERVE','RELEASE','ADJUST','EXPIRE'))
);

/* =============================================================================
   YÊU CẦU MÁU & QUY TRÌNH
   ============================================================================= */

CREATE TABLE dbo.blood_requests (
    request_id              INT NOT NULL IDENTITY(1,1),
    request_code            NVARCHAR(30) NOT NULL,
    facility_id             INT NOT NULL,
    requester_user_id       INT NULL,
    patient_name            NVARCHAR(150) NOT NULL,
    patient_phone           NVARCHAR(20) NULL,
    blood_type_id           INT NOT NULL,
    component_id            INT NOT NULL,
    units_needed            INT NOT NULL,
    units_fulfilled         INT NOT NULL CONSTRAINT df_blood_requests_units_fulfilled DEFAULT (0),
    urgency_id              INT NOT NULL,
    status_id               INT NOT NULL,
    is_emergency            BIT NOT NULL CONSTRAINT df_blood_requests_is_emergency DEFAULT (0),
    hospital_name           NVARCHAR(200) NULL,
    ward_room               NVARCHAR(100) NULL,
    clinical_notes          NVARCHAR(1000) NULL,
    province_id             INT NULL,
    district_id             INT NULL,
    ward_id                 INT NULL,
    address                 NVARCHAR(500) NULL,
    latitude                DECIMAL(10,7) NULL,
    longitude               DECIMAL(10,7) NULL,
    required_before         DATETIME2(0) NULL,
    fulfilled_from_stock    BIT NOT NULL CONSTRAINT df_blood_requests_fulfilled_from_stock DEFAULT (0),
    needs_donor_match       BIT NOT NULL CONSTRAINT df_blood_requests_needs_donor_match DEFAULT (0),
    assigned_staff_id       INT NULL,
    created_at              DATETIME2(0) NOT NULL CONSTRAINT df_blood_requests_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at              DATETIME2(0) NULL,
    completed_at            DATETIME2(0) NULL,
    CONSTRAINT pk_blood_requests PRIMARY KEY (request_id),
    CONSTRAINT uq_blood_requests_code UNIQUE (request_code),
    CONSTRAINT fk_blood_requests_facility FOREIGN KEY (facility_id) REFERENCES dbo.medical_facilities(facility_id),
    CONSTRAINT fk_blood_requests_requester FOREIGN KEY (requester_user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT fk_blood_requests_blood_type FOREIGN KEY (blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT fk_blood_requests_component FOREIGN KEY (component_id) REFERENCES dbo.blood_components(component_id),
    CONSTRAINT fk_blood_requests_urgency FOREIGN KEY (urgency_id) REFERENCES dbo.urgency_levels(urgency_id),
    CONSTRAINT fk_blood_requests_status FOREIGN KEY (status_id) REFERENCES dbo.blood_request_statuses(status_id),
    CONSTRAINT fk_blood_requests_staff FOREIGN KEY (assigned_staff_id) REFERENCES dbo.users(user_id),
    CONSTRAINT ck_blood_requests_units CHECK (units_needed > 0 AND units_fulfilled >= 0 AND units_fulfilled <= units_needed)
);

CREATE TABLE dbo.blood_request_status_history (
    history_id      INT NOT NULL IDENTITY(1,1),
    request_id      INT NOT NULL,
    from_status_id  INT NULL,
    to_status_id    INT NOT NULL,
    changed_by      INT NULL,
    change_reason   NVARCHAR(500) NULL,
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_blood_request_status_history_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_blood_request_status_history PRIMARY KEY (history_id),
    CONSTRAINT fk_blood_request_status_history_request FOREIGN KEY (request_id) REFERENCES dbo.blood_requests(request_id),
    CONSTRAINT fk_blood_request_status_history_from FOREIGN KEY (from_status_id) REFERENCES dbo.blood_request_statuses(status_id),
    CONSTRAINT fk_blood_request_status_history_to FOREIGN KEY (to_status_id) REFERENCES dbo.blood_request_statuses(status_id),
    CONSTRAINT fk_blood_request_status_history_user FOREIGN KEY (changed_by) REFERENCES dbo.users(user_id)
);

CREATE TABLE dbo.blood_request_inventory_allocations (
    allocation_id   INT NOT NULL IDENTITY(1,1),
    request_id      INT NOT NULL,
    inventory_id    INT NOT NULL,
    allocated_at    DATETIME2(0) NOT NULL CONSTRAINT df_blood_request_inventory_allocations_allocated_at DEFAULT (SYSUTCDATETIME()),
    allocated_by    INT NULL,
    released_at     DATETIME2(0) NULL,
    is_active       BIT NOT NULL CONSTRAINT df_blood_request_inventory_allocations_is_active DEFAULT (1),
    CONSTRAINT pk_blood_request_inventory_allocations PRIMARY KEY (allocation_id),
    CONSTRAINT fk_blood_request_inventory_allocations_request FOREIGN KEY (request_id) REFERENCES dbo.blood_requests(request_id),
    CONSTRAINT fk_blood_request_inventory_allocations_inventory FOREIGN KEY (inventory_id) REFERENCES dbo.blood_inventory(inventory_id),
    CONSTRAINT fk_blood_request_inventory_allocations_user FOREIGN KEY (allocated_by) REFERENCES dbo.users(user_id)
);

CREATE TABLE dbo.blood_request_donor_matches (
    match_id        INT NOT NULL IDENTITY(1,1),
    request_id      INT NOT NULL,
    donor_user_id   INT NOT NULL,
    distance_km     DECIMAL(10,2) NULL,
    match_score     DECIMAL(5,2) NULL,
    match_status    NVARCHAR(20) NOT NULL CONSTRAINT df_blood_request_donor_matches_match_status DEFAULT ('PENDING'),
    contacted_at    DATETIME2(0) NULL,
    responded_at    DATETIME2(0) NULL,
    staff_notes     NVARCHAR(500) NULL,
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_blood_request_donor_matches_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_blood_request_donor_matches PRIMARY KEY (match_id),
    CONSTRAINT fk_blood_request_donor_matches_request FOREIGN KEY (request_id) REFERENCES dbo.blood_requests(request_id),
    CONSTRAINT fk_blood_request_donor_matches_donor FOREIGN KEY (donor_user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT ck_blood_request_donor_matches_status CHECK (match_status IN ('PENDING','CONTACTED','ACCEPTED','DECLINED','COMPLETED','CANCELLED'))
);

/* =============================================================================
   HIẾN MÁU & NHẮC PHỤC HỒI
   ============================================================================= */

CREATE TABLE dbo.donations (
    donation_id         INT NOT NULL IDENTITY(1,1),
    donation_code       NVARCHAR(30) NOT NULL,
    facility_id         INT NOT NULL,
    donor_user_id       INT NOT NULL,
    blood_type_id       INT NOT NULL,
    component_id        INT NOT NULL,
    request_id          INT NULL,
    volume_ml           INT NOT NULL,
    donation_date       DATETIME2(0) NOT NULL,
    staff_user_id       INT NULL,
    health_check_passed BIT NOT NULL CONSTRAINT df_donations_health_check_passed DEFAULT (1),
    result_notes        NVARCHAR(500) NULL,
    inventory_id        INT NULL,
    status_code         NVARCHAR(20) NOT NULL CONSTRAINT df_donations_status_code DEFAULT ('COMPLETED'),
    next_eligible_date  DATE NULL,
    created_at          DATETIME2(0) NOT NULL CONSTRAINT df_donations_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_donations PRIMARY KEY (donation_id),
    CONSTRAINT uq_donations_code UNIQUE (donation_code),
    CONSTRAINT fk_donations_facility FOREIGN KEY (facility_id) REFERENCES dbo.medical_facilities(facility_id),
    CONSTRAINT fk_donations_donor FOREIGN KEY (donor_user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT fk_donations_blood_type FOREIGN KEY (blood_type_id) REFERENCES dbo.blood_types(blood_type_id),
    CONSTRAINT fk_donations_component FOREIGN KEY (component_id) REFERENCES dbo.blood_components(component_id),
    CONSTRAINT fk_donations_request FOREIGN KEY (request_id) REFERENCES dbo.blood_requests(request_id),
    CONSTRAINT fk_donations_staff FOREIGN KEY (staff_user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT fk_donations_inventory FOREIGN KEY (inventory_id) REFERENCES dbo.blood_inventory(inventory_id),
    CONSTRAINT ck_donations_status CHECK (status_code IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED'))
);

ALTER TABLE dbo.blood_inventory
    ADD CONSTRAINT fk_blood_inventory_source_donation FOREIGN KEY (source_donation_id) REFERENCES dbo.donations(donation_id);

CREATE TABLE dbo.donation_reminders (
    reminder_id     INT NOT NULL IDENTITY(1,1),
    user_id         INT NOT NULL,
    donation_id     INT NULL,
    component_id    INT NOT NULL,
    reminder_type   NVARCHAR(30) NOT NULL,
    reminder_date   DATE NOT NULL,
    message         NVARCHAR(500) NOT NULL,
    is_sent         BIT NOT NULL CONSTRAINT df_donation_reminders_is_sent DEFAULT (0),
    sent_at         DATETIME2(0) NULL,
    is_read         BIT NOT NULL CONSTRAINT df_donation_reminders_is_read DEFAULT (0),
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_donation_reminders_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_donation_reminders PRIMARY KEY (reminder_id),
    CONSTRAINT fk_donation_reminders_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT fk_donation_reminders_donation FOREIGN KEY (donation_id) REFERENCES dbo.donations(donation_id),
    CONSTRAINT fk_donation_reminders_component FOREIGN KEY (component_id) REFERENCES dbo.blood_components(component_id)
);

/* =============================================================================
   THÔNG BÁO, CÀI ĐẶT, OTP
   ============================================================================= */

CREATE TABLE dbo.otp_types (
    otp_type_id     INT NOT NULL IDENTITY(1,1),
    otp_type_code   NVARCHAR(50) NOT NULL,
    otp_type_name   NVARCHAR(100) NOT NULL,
    description     NVARCHAR(500) NULL,
    expiry_minutes  INT NOT NULL CONSTRAINT df_otp_types_expiry_minutes DEFAULT (10),
    max_attempts    INT NOT NULL CONSTRAINT df_otp_types_max_attempts DEFAULT (5),
    is_active       BIT NOT NULL CONSTRAINT df_otp_types_is_active DEFAULT (1),
    created_at      DATETIME2(0) NOT NULL CONSTRAINT df_otp_types_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_otp_types PRIMARY KEY (otp_type_id),
    CONSTRAINT uq_otp_types_code UNIQUE (otp_type_code),
    CONSTRAINT ck_otp_types_expiry CHECK (expiry_minutes > 0),
    CONSTRAINT ck_otp_types_attempts CHECK (max_attempts > 0)
);

CREATE TABLE dbo.user_otps (
    otp_id              BIGINT NOT NULL IDENTITY(1,1),
    user_id             INT NULL,
    otp_type_id         INT NOT NULL,
    destination         NVARCHAR(150) NOT NULL,
    destination_type    NVARCHAR(10) NOT NULL,
    otp_hash            NVARCHAR(256) NOT NULL,
    expires_at          DATETIME2(0) NOT NULL,
    is_verified         BIT NOT NULL CONSTRAINT df_user_otps_is_verified DEFAULT (0),
    verified_at         DATETIME2(0) NULL,
    attempt_count       INT NOT NULL CONSTRAINT df_user_otps_attempt_count DEFAULT (0),
    max_attempts        INT NOT NULL,
    ip_address          NVARCHAR(45) NULL,
    reference_type      NVARCHAR(50) NULL,
    reference_id        INT NULL,
    created_at          DATETIME2(0) NOT NULL CONSTRAINT df_user_otps_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_user_otps PRIMARY KEY (otp_id),
    CONSTRAINT fk_user_otps_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT fk_user_otps_type FOREIGN KEY (otp_type_id) REFERENCES dbo.otp_types(otp_type_id),
    CONSTRAINT ck_user_otps_destination_type CHECK (destination_type IN ('email','phone'))
);

CREATE TABLE dbo.notifications (
    notification_id     INT NOT NULL IDENTITY(1,1),
    user_id             INT NOT NULL,
    title               NVARCHAR(200) NOT NULL,
    message             NVARCHAR(1000) NOT NULL,
    notification_type   NVARCHAR(50) NOT NULL,
    reference_type      NVARCHAR(50) NULL,
    reference_id        INT NULL,
    is_read             BIT NOT NULL CONSTRAINT df_notifications_is_read DEFAULT (0),
    created_at          DATETIME2(0) NOT NULL CONSTRAINT df_notifications_created_at DEFAULT (SYSUTCDATETIME()),
    read_at             DATETIME2(0) NULL,
    CONSTRAINT pk_notifications PRIMARY KEY (notification_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);

CREATE TABLE dbo.system_settings (
    setting_id      INT NOT NULL IDENTITY(1,1),
    setting_key     NVARCHAR(100) NOT NULL,
    setting_value   NVARCHAR(MAX) NOT NULL,
    description     NVARCHAR(500) NULL,
    updated_at      DATETIME2(0) NOT NULL CONSTRAINT df_system_settings_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT pk_system_settings PRIMARY KEY (setting_id),
    CONSTRAINT uq_system_settings_key UNIQUE (setting_key)
);

GO

/* =============================================================================
   INDEX
   ============================================================================= */
CREATE INDEX ix_users_role_id ON dbo.users(role_id);
CREATE INDEX ix_users_blood_type_id ON dbo.users(blood_type_id) WHERE blood_type_id IS NOT NULL;
CREATE INDEX ix_users_location ON dbo.users(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX ix_users_available_donor ON dbo.users(is_available_for_donation, blood_type_id) WHERE is_donor_registered = 1;

CREATE INDEX ix_blood_inventory_lookup ON dbo.blood_inventory(facility_id, blood_type_id, component_id, status_code);
CREATE INDEX ix_blood_inventory_expiry ON dbo.blood_inventory(expiry_date, status_code);

CREATE INDEX ix_blood_requests_status ON dbo.blood_requests(status_id, urgency_id, is_emergency);
CREATE INDEX ix_blood_requests_location ON dbo.blood_requests(latitude, longitude);
CREATE INDEX ix_blood_requests_created_at ON dbo.blood_requests(created_at DESC);

CREATE INDEX ix_donations_donor ON dbo.donations(donor_user_id, donation_date DESC);
CREATE INDEX ix_donations_facility ON dbo.donations(facility_id, donation_date DESC);

CREATE INDEX ix_blood_request_donor_matches_request ON dbo.blood_request_donor_matches(request_id, match_status);
CREATE INDEX ix_donation_reminders_user_date ON dbo.donation_reminders(user_id, reminder_date, is_sent);

CREATE INDEX ix_blood_compatibility_lookup ON dbo.blood_compatibility(component_id, recipient_blood_type_id, donor_blood_type_id);

CREATE INDEX ix_user_otps_lookup ON dbo.user_otps(user_id, otp_type_id, is_verified, expires_at);
CREATE INDEX ix_user_otps_destination ON dbo.user_otps(destination, otp_type_id, created_at DESC);

CREATE INDEX ix_blog_comments_post_thread ON dbo.blog_comments(post_id, parent_comment_id, created_at);

GO

/* =============================================================================
   DỮ LIỆU MẪU (SEED)
   ============================================================================= */

INSERT INTO dbo.roles (role_code, role_name, description) VALUES
(N'guest',   N'Khách',      N'Xem công khai, tra cứu tương thích'),
(N'member',  N'Thành viên', N'Đăng ký hiến máu, yêu cầu, lịch sử'),
(N'staff',   N'Nhân viên',  N'Xử lý quy trình, kho máu, kết nối'),
(N'admin',   N'Quản trị',   N'Quản trị hệ thống, báo cáo');

INSERT INTO dbo.blood_types (blood_type_code, abo, rh_factor, display_order) VALUES
(N'O-',  'O',  '-', 1), (N'O+',  'O',  '+', 2),
(N'A-',  'A',  '-', 3), (N'A+',  'A',  '+', 4),
(N'B-',  'B',  '-', 5), (N'B+',  'B',  '+', 6),
(N'AB-', 'AB', '-', 7), (N'AB+', 'AB', '+', 8);

INSERT INTO dbo.blood_components (component_code, component_name, description) VALUES
(N'whole_blood', N'Máu toàn phần', N'Tráo toàn bộ đơn vị máu'),
(N'rbc',         N'Hồng cầu',      N'Khối hồng cầu'),
(N'plasma',      N'Huyết tương',   N'Huyết tương tươi / đông lạnh'),
(N'platelets',   N'Tiểu cầu',      N'Khối tiểu cầu');

INSERT INTO dbo.donation_interval_rules (component_id, min_interval_days, max_donations_per_year, description)
SELECT component_id,
    CASE component_code WHEN N'whole_blood' THEN 56 WHEN N'rbc' THEN 56 WHEN N'plasma' THEN 28 WHEN N'platelets' THEN 7 END,
    CASE component_code WHEN N'whole_blood' THEN 6 WHEN N'rbc' THEN 6 WHEN N'plasma' THEN 24 WHEN N'platelets' THEN 24 END,
    N'Quy tắc nghỉ phục hồi giữa các lần hiến'
FROM dbo.blood_components;

INSERT INTO dbo.blood_request_statuses (status_code, status_name, description, sort_order, is_terminal) VALUES
(N'pending',             N'Chờ xử lý',           N'Yêu cầu mới tạo', 10, 0),
(N'checking_stock',      N'Kiểm tra kho',        N'Đang kiểm tra tồn kho', 20, 0),
(N'allocated_stock',     N'Đã cấp từ kho',       N'Đủ máu trong kho', 30, 0),
(N'matching_donors',     N'Đang tìm người hiến', N'Kho không đủ', 40, 0),
(N'donor_contacted',     N'Đã liên hệ hiến',    N'Đã liên hệ người hiến', 50, 0),
(N'scheduled',           N'Đã lên lịch',         N'Đặt lịch hiến/nhận', 60, 0),
(N'in_progress',         N'Đang thực hiện',      N'Đang hiến hoặc truyền', 70, 0),
(N'partially_fulfilled', N'Hoàn thành một phần',N'Đáp ứng một phần', 80, 0),
(N'completed',           N'Hoàn tất',            N'Hoàn tất quy trình', 90, 1),
(N'cancelled',           N'Đã hủy',              N'Hủy yêu cầu', 100, 1),
(N'expired',             N'Hết hạn',             N'Quá hạn cần máu', 110, 1);

INSERT INTO dbo.urgency_levels (urgency_code, urgency_name, priority_level) VALUES
(N'emergency', N'Khẩn cấp', 1),
(N'urgent',    N'Cần gấp', 2),
(N'normal',    N'Bình thường', 3),
(N'planned',   N'Kế hoạch', 4);

INSERT INTO dbo.otp_types (otp_type_code, otp_type_name, description, expiry_minutes, max_attempts) VALUES
(N'register_verify',       N'Xác thực đăng ký',           N'OTP gửi email khi tạo tài khoản mới', 15, 5),
(N'login_verify',          N'Xác thực đăng nhập',         N'OTP đăng nhập 2 bước (2FA)', 10, 5),
(N'reset_password',        N'Đặt lại mật khẩu',           N'OTP quên mật khẩu', 15, 5),
(N'change_email',          N'Đổi email',                  N'Xác nhận trước khi đổi email', 10, 3),
(N'change_phone',          N'Đổi số điện thoại',          N'Xác nhận trước khi đổi SĐT', 10, 3),
(N'confirm_emergency_request', N'Xác nhận yêu cầu khẩn', N'OTP xác nhận tạo yêu cầu máu khẩn cấp', 10, 3),
(N'confirm_donation',      N'Xác nhận hiến máu',         N'OTP xác nhận trước khi ghi nhận hiến', 10, 3),
(N'delete_account',        N'Xóa tài khoản',              N'OTP xác nhận xóa/vô hiệu tài khoản', 10, 3);

-- Ma trận tương thích: toàn phần + hồng cầu
;WITH bt AS (SELECT blood_type_id, blood_type_code, abo, rh_factor FROM dbo.blood_types),
compat_rbc AS (
    SELECT d.blood_type_id AS donor_id, r.blood_type_id AS recipient_id
    FROM bt d CROSS JOIN bt r
    WHERE
        (d.blood_type_code = N'O-') OR
        (d.blood_type_code = N'O+' AND r.rh_factor = N'+') OR
        (d.blood_type_code = N'A-' AND r.abo IN (N'A', N'AB')) OR
        (d.blood_type_code = N'A+' AND r.abo IN (N'A', N'AB') AND r.rh_factor = N'+') OR
        (d.blood_type_code = N'B-' AND r.abo IN (N'B', N'AB')) OR
        (d.blood_type_code = N'B+' AND r.abo IN (N'B', N'AB') AND r.rh_factor = N'+') OR
        (d.blood_type_code = N'AB-' AND r.abo = N'AB') OR
        (d.blood_type_code = N'AB+' AND r.blood_type_code = N'AB+')
)
INSERT INTO dbo.blood_compatibility (component_id, donor_blood_type_id, recipient_blood_type_id, is_compatible, notes)
SELECT c.component_id, x.donor_id, x.recipient_id, 1, N'whole_blood / rbc'
FROM compat_rbc x
CROSS JOIN dbo.blood_components c
WHERE c.component_code IN (N'whole_blood', N'rbc');

-- Huyết tương
;WITH bt AS (SELECT blood_type_id, abo FROM dbo.blood_types),
compat_plasma AS (
    SELECT d.blood_type_id AS donor_id, r.blood_type_id AS recipient_id
    FROM bt d CROSS JOIN bt r
    WHERE (d.abo = N'AB') OR (d.abo = N'A' AND r.abo IN (N'A', N'AB')) OR (d.abo = N'B' AND r.abo IN (N'B', N'AB')) OR (d.abo = N'O' AND r.abo = N'O')
)
INSERT INTO dbo.blood_compatibility (component_id, donor_blood_type_id, recipient_blood_type_id, is_compatible, notes)
SELECT c.component_id, x.donor_id, x.recipient_id, 1, N'plasma'
FROM compat_plasma x
CROSS JOIN dbo.blood_components c WHERE c.component_code = N'plasma';

-- Tiểu cầu
;WITH bt AS (SELECT blood_type_id, blood_type_code, abo, rh_factor FROM dbo.blood_types),
compat_plt AS (
    SELECT d.blood_type_id AS donor_id, r.blood_type_id AS recipient_id
    FROM bt d CROSS JOIN bt r
    WHERE (r.blood_type_code = N'AB+') OR (d.blood_type_code = N'O-' AND r.blood_type_code <> N'AB+')
       OR (d.abo = r.abo AND d.rh_factor = r.rh_factor)
       OR (d.abo = r.abo AND d.rh_factor = N'+' AND r.rh_factor = N'+')
)
INSERT INTO dbo.blood_compatibility (component_id, donor_blood_type_id, recipient_blood_type_id, is_compatible, notes)
SELECT c.component_id, x.donor_id, x.recipient_id, 1, N'platelets'
FROM compat_plt x
CROSS JOIN dbo.blood_components c WHERE c.component_code = N'platelets';

-- Địa giới hành chính mẫu
INSERT INTO dbo.provinces (province_code, province_name) VALUES (N'79', N'TP. Hồ Chí Minh');
DECLARE @province_id INT = SCOPE_IDENTITY();

INSERT INTO dbo.districts (province_id, district_name) VALUES
(@province_id, N'Quận 1'), (@province_id, N'Quận 3'), (@province_id, N'Quận 10');

DECLARE @district_id INT = (SELECT district_id FROM dbo.districts WHERE district_name = N'Quận 1' AND province_id = @province_id);

INSERT INTO dbo.wards (district_id, ward_name) VALUES
(@district_id, N'Phường Bến Nghé'), (@district_id, N'Phường Đa Kao');

DECLARE @ward_id INT = (SELECT TOP 1 ward_id FROM dbo.wards WHERE district_id = @district_id);

INSERT INTO dbo.medical_facilities (
    facility_code, facility_name, short_name, address,
    province_id, district_id, ward_id,
    phone, email, website, latitude, longitude, is_primary
) VALUES (
    N'bv-hm-001',
    N'Bệnh viện Huyết học - Truyền máu (Chi nhánh Hiến máu)',
    N'BV Hiến máu',
    N'118 Hồng Bàng, Quận 5, TP.HCM',
    @province_id, @district_id, @ward_id,
    N'02839571234', N'lienhe@hienmau.vn', N'https://hienmau.vn',
    10.7570000, 106.6600000, 1
);

DECLARE @facility_id INT = SCOPE_IDENTITY();

INSERT INTO dbo.education_document_categories (category_name, description, sort_order) VALUES
(N'Nhóm máu cơ bản', N'Kiến thức ABO/Rh', 1),
(N'Chuẩn bị hiến máu', N'Hướng dẫn trước/sau hiến', 2);

INSERT INTO dbo.blog_categories (category_name, slug) VALUES
(N'Kinh nghiệm hiến máu', N'kinh-nghiem'),
(N'Câu chuyện cứu người', N'cau-chuyen');

DECLARE @admin_role_id  INT = (SELECT role_id FROM dbo.roles WHERE role_code = N'admin');
DECLARE @staff_role_id  INT = (SELECT role_id FROM dbo.roles WHERE role_code = N'staff');
DECLARE @member_role_id INT = (SELECT role_id FROM dbo.roles WHERE role_code = N'member');
DECLARE @o_pos_id       INT = (SELECT blood_type_id FROM dbo.blood_types WHERE blood_type_code = N'O+');
DECLARE @a_pos_id       INT = (SELECT blood_type_id FROM dbo.blood_types WHERE blood_type_code = N'A+');
DECLARE @ab_pos_id      INT = (SELECT blood_type_id FROM dbo.blood_types WHERE blood_type_code = N'AB+');

-- Password@123 (SHA256 Base64 demo — app nên dùng bcrypt/Argon2)
DECLARE @pwd_hash NVARCHAR(256) = N'jGl25bVBBBW96Qi9Te4V37Fnqchz/Eu4qB9vKrRIqRg=';

INSERT INTO dbo.users (
    role_id, email, password_hash, full_name, phone, blood_type_id,
    is_donor_registered, is_available_for_donation, is_email_verified,
    province_id, district_id, ward_id, latitude, longitude
) VALUES
(@admin_role_id,  N'admin@hienmau.vn',  @pwd_hash, N'Quản trị hệ thống', N'0901000001', NULL, 0, 0, 1, @province_id, @district_id, @ward_id, 10.7769, 106.7009),
(@staff_role_id,  N'staff@hienmau.vn',  @pwd_hash, N'Nhân viên Truyền máu', N'0901000002', NULL, 0, 0, 1, @province_id, @district_id, @ward_id, 10.7700, 106.6900),
(@member_role_id, N'donor1@hienmau.vn', @pwd_hash, N'Nguyễn Văn Hiến', N'0903000001', @o_pos_id, 1, 1, 1, @province_id, @district_id, @ward_id, 10.7620, 106.6820),
(@member_role_id, N'donor2@hienmau.vn', @pwd_hash, N'Trần Thị Lan', N'0903000002', @a_pos_id, 1, 1, 1, @province_id, @district_id, @ward_id, 10.8000, 106.7100);

DECLARE @donor1_id INT = (SELECT user_id FROM dbo.users WHERE email = N'donor1@hienmau.vn');
DECLARE @donor2_id INT = (SELECT user_id FROM dbo.users WHERE email = N'donor2@hienmau.vn');
DECLARE @staff_id  INT = (SELECT user_id FROM dbo.users WHERE email = N'staff@hienmau.vn');
DECLARE @admin_id  INT = (SELECT user_id FROM dbo.users WHERE email = N'admin@hienmau.vn');

INSERT INTO dbo.donor_profiles (user_id, blood_type_id, weight_kg, total_donations, last_donation_date, next_eligible_date) VALUES
(@donor1_id, @o_pos_id, 65.0, 3, DATEADD(DAY, -70, CAST(GETDATE() AS DATE)), CAST(GETDATE() AS DATE)),
(@donor2_id, @a_pos_id, 55.0, 1, DATEADD(DAY, -30, CAST(GETDATE() AS DATE)), DATEADD(DAY, 26, CAST(GETDATE() AS DATE)));

INSERT INTO dbo.donor_availability_slots (user_id, day_of_week, start_time, end_time, is_recurring, notes) VALUES
(@donor1_id, 6, '08:00', '11:00', 1, N'Sáng thứ 7'),
(@donor1_id, 0, '14:00', '17:00', 1, N'Chiều chủ nhật'),
(@donor2_id, 3, '09:00', '12:00', 1, N'Thứ Tư sáng');

DECLARE @cat_id INT = (SELECT TOP 1 category_id FROM dbo.education_document_categories);

INSERT INTO dbo.education_documents (category_id, blood_type_id, title, slug, summary, content_html, is_published, published_at, created_by) VALUES
(@cat_id, @o_pos_id, N'Nhóm máu O+', N'nhom-mau-o-cong', N'O+ phổ biến',
 N'<p>Người O+ có thể hiến cho nhiều nhóm Rh dương tính.</p>', 1, SYSUTCDATETIME(), @admin_id);

DECLARE @blog_cat_id INT = (SELECT blog_category_id FROM dbo.blog_categories WHERE slug = N'kinh-nghiem');

INSERT INTO dbo.blog_posts (blog_category_id, author_user_id, title, slug, summary, content_html, is_published, published_at) VALUES
(@blog_cat_id, @donor1_id, N'Lần đầu hiến máu', N'lan-dau-hien-mau', N'Chia sẻ trải nghiệm',
 N'<p>Nhân viên y tế hướng dẫn rất chu đáo.</p>', 1, SYSUTCDATETIME());

DECLARE @demo_post_id INT = SCOPE_IDENTITY();

INSERT INTO dbo.blog_comments (post_id, parent_comment_id, user_id, reply_to_user_id, content, is_approved) VALUES
(@demo_post_id, NULL, @donor2_id, NULL, N'Bài viết rất hữu ích, cảm ơn bạn!', 1);

DECLARE @demo_comment_id INT = SCOPE_IDENTITY();

INSERT INTO dbo.blog_comments (post_id, parent_comment_id, user_id, reply_to_user_id, content, is_approved) VALUES
(@demo_post_id, @demo_comment_id, @donor1_id, @donor2_id, N'Cảm ơn bạn đã đọc và động viên!', 1);

DECLARE @whole_id INT = (SELECT component_id FROM dbo.blood_components WHERE component_code = N'whole_blood');
DECLARE @rbc_id   INT = (SELECT component_id FROM dbo.blood_components WHERE component_code = N'rbc');
DECLARE @plt_id   INT = (SELECT component_id FROM dbo.blood_components WHERE component_code = N'platelets');

INSERT INTO dbo.blood_inventory (facility_id, blood_type_id, component_id, bag_code, volume_ml, collection_date, expiry_date, status_code) VALUES
(@facility_id, @o_pos_id, @whole_id, N'bag-o+-001', 450, DATEADD(DAY,-5,GETDATE()), DATEADD(DAY,30,GETDATE()), N'AVAILABLE'),
(@facility_id, @o_pos_id, @rbc_id,   N'bag-o+-002', 300, DATEADD(DAY,-3,GETDATE()), DATEADD(DAY,40,GETDATE()), N'AVAILABLE'),
(@facility_id, @a_pos_id, @whole_id, N'bag-a+-001', 450, DATEADD(DAY,-10,GETDATE()), DATEADD(DAY,25,GETDATE()), N'AVAILABLE');

INSERT INTO dbo.system_settings (setting_key, setting_value, description) VALUES
(N'max_search_radius_km', N'50', N'Bán kính tìm người hiến tối đa (km)'),
(N'reminder_days_before_eligible', N'3', N'Nhắc trước ngày đủ điều kiện hiến lại'),
(N'facility_default_id', CAST(@facility_id AS NVARCHAR(10)), N'ID cơ sở y tế mặc định'),
(N'otp_length', N'6', N'Độ dài mã OTP (số) — app sinh và hash trước khi lưu');

-- Yêu cầu khẩn cấp mẫu (kho không đủ tiểu cầu AB+ → cần match người hiến)
DECLARE @emergency_urgency_id INT = (SELECT urgency_id FROM dbo.urgency_levels WHERE urgency_code = N'emergency');
DECLARE @matching_status_id   INT = (SELECT status_id FROM dbo.blood_request_statuses WHERE status_code = N'matching_donors');
DECLARE @pending_status_id    INT = (SELECT status_id FROM dbo.blood_request_statuses WHERE status_code = N'pending');

INSERT INTO dbo.blood_requests (
    request_code, facility_id, patient_name, patient_phone,
    blood_type_id, component_id, units_needed, units_fulfilled,
    urgency_id, status_id, is_emergency,
    latitude, longitude, clinical_notes,
    fulfilled_from_stock, needs_donor_match, assigned_staff_id
) VALUES (
    N'rq-demo-001', @facility_id, N'Bệnh nhân Nguyễn A', N'0912345678',
    @ab_pos_id, @plt_id, 2, 0,
    @emergency_urgency_id, @matching_status_id, 1,
    10.7700, 106.6900, N'Phẫu thuật cấp cứu — cần tiểu cầu',
    0, 1, @staff_id
);

DECLARE @demo_request_id INT = SCOPE_IDENTITY();

INSERT INTO dbo.blood_request_status_history (request_id, from_status_id, to_status_id, changed_by, change_reason) VALUES
(@demo_request_id, NULL, @pending_status_id, @staff_id, N'Tạo yêu cầu khẩn cấp'),
(@demo_request_id, @pending_status_id, @matching_status_id, @staff_id, N'Kho không đủ tiểu cầu AB+');

INSERT INTO dbo.blood_request_donor_matches (request_id, donor_user_id, distance_km, match_score, match_status) VALUES
(@demo_request_id, @donor1_id, 1.20, 98.80, N'pending'),
(@demo_request_id, @donor2_id, 4.50, 95.50, N'pending');

GO

PRINT N'========================================';
PRINT N' BloodDonationDB — schema + seed hoàn tất';
PRINT N' Quy ước : snake_case (bảng + cột)';
PRINT N' Không có : function / procedure / view';
PRINT N'----------------------------------------';
PRINT N' Tài khoản mẫu (Password@123):';
PRINT N'   admin@hienmau.vn  (admin)';
PRINT N'   staff@hienmau.vn  (staff)';
PRINT N'   donor1@hienmau.vn (member)';
PRINT N'   donor2@hienmau.vn (member)';
PRINT N'========================================';
GO
