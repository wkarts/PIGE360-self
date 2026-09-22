
CREATE TABLE companies (
	name VARCHAR(160) NOT NULL, 
	document VARCHAR(24), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_companies PRIMARY KEY (id)
)

;

CREATE TABLE installation (
	id SERIAL NOT NULL, 
	configured BOOLEAN NOT NULL, 
	configured_at TIMESTAMP WITH TIME ZONE, 
	CONSTRAINT pk_installation PRIMARY KEY (id)
)

;

CREATE TABLE login_attempts (
	key VARCHAR(64) NOT NULL, 
	count INTEGER NOT NULL, 
	window_started TIMESTAMP WITH TIME ZONE NOT NULL, 
	CONSTRAINT pk_login_attempts PRIMARY KEY (key)
)

;

CREATE TABLE number_sequences (
	key VARCHAR(160) NOT NULL, 
	value INTEGER NOT NULL, 
	CONSTRAINT pk_number_sequences PRIMARY KEY (key)
)

;

CREATE TABLE users (
	name VARCHAR(160) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	password_hash VARCHAR(512) NOT NULL, 
	role VARCHAR(32) NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_users PRIMARY KEY (id), 
	CONSTRAINT ck_users_valid_role CHECK (role IN ('admin','secretary','viewer')), 
	CONSTRAINT uq_users_email UNIQUE (email)
)

;

CREATE TABLE auth_sessions (
	user_id VARCHAR(36) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	previous_hash VARCHAR(64), 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_auth_sessions PRIMARY KEY (id), 
	CONSTRAINT fk_auth_sessions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
)

;

CREATE TABLE schools (
	company_id VARCHAR(36) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	address VARCHAR(400) NOT NULL, 
	phone VARCHAR(32) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	document_policy VARCHAR(16) NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_schools PRIMARY KEY (id), 
	CONSTRAINT ck_schools_document_policy CHECK (document_policy IN ('warn','block')), 
	CONSTRAINT fk_schools_company_id_companies FOREIGN KEY(company_id) REFERENCES companies (id)
)

;

CREATE TABLE academic_years (
	name VARCHAR(40) NOT NULL, 
	starts_on DATE NOT NULL, 
	ends_on DATE NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_academic_years PRIMARY KEY (id), 
	CONSTRAINT uq_academic_years_school_id UNIQUE (school_id, name), 
	CONSTRAINT ck_academic_years_year_dates CHECK (ends_on >= starts_on), 
	CONSTRAINT fk_academic_years_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE admission_campaigns (
	slug VARCHAR(80) NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	instructions TEXT NOT NULL, 
	privacy_notice TEXT NOT NULL, 
	terms_version VARCHAR(40) NOT NULL, 
	class_group_ids JSON NOT NULL, 
	opens_on DATE NOT NULL, 
	closes_on DATE NOT NULL, 
	active BOOLEAN NOT NULL, 
	require_verified_contact BOOLEAN NOT NULL, 
	require_documents BOOLEAN NOT NULL, 
	require_payment_before_enrollment BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_admission_campaigns PRIMARY KEY (id), 
	CONSTRAINT ck_admission_campaigns_campaign_dates CHECK (closes_on >= opens_on), 
	CONSTRAINT uq_admission_campaigns_slug UNIQUE (slug), 
	CONSTRAINT fk_admission_campaigns_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE audit_events (
	school_id VARCHAR(36), 
	actor_id VARCHAR(36), 
	action VARCHAR(80) NOT NULL, 
	entity_type VARCHAR(60) NOT NULL, 
	entity_id VARCHAR(64) NOT NULL, 
	details JSON NOT NULL, 
	request_id VARCHAR(64) NOT NULL, 
	ip VARCHAR(64) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_audit_events PRIMARY KEY (id), 
	CONSTRAINT fk_audit_events_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id), 
	CONSTRAINT fk_audit_events_actor_id_users FOREIGN KEY(actor_id) REFERENCES users (id)
)

;

CREATE TABLE files (
	original_name VARCHAR(240) NOT NULL, 
	storage_key VARCHAR(200) NOT NULL, 
	mime_type VARCHAR(100) NOT NULL, 
	size INTEGER NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	created_by VARCHAR(36) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_files PRIMARY KEY (id), 
	CONSTRAINT uq_files_storage_key UNIQUE (storage_key), 
	CONSTRAINT fk_files_created_by_users FOREIGN KEY(created_by) REFERENCES users (id), 
	CONSTRAINT fk_files_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE grades (
	name VARCHAR(100) NOT NULL, 
	level VARCHAR(100) NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_grades PRIMARY KEY (id), 
	CONSTRAINT uq_grades_school_id UNIQUE (school_id, name), 
	CONSTRAINT fk_grades_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE integration_connections (
	provider VARCHAR(24) NOT NULL, 
	enabled BOOLEAN NOT NULL, 
	environment VARCHAR(16) NOT NULL, 
	config JSON NOT NULL, 
	encrypted_secrets TEXT NOT NULL, 
	last_test_at TIMESTAMP WITH TIME ZONE, 
	last_test_ok BOOLEAN, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_integration_connections PRIMARY KEY (id), 
	CONSTRAINT uq_integration_connections_school_id UNIQUE (school_id, provider), 
	CONSTRAINT ck_integration_connections_integration_provider CHECK (provider IN ('connect_api','asaas')), 
	CONSTRAINT fk_integration_connections_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE persons (
	name VARCHAR(180) NOT NULL, 
	social_name VARCHAR(180) NOT NULL, 
	cpf VARCHAR(11), 
	birth_date DATE, 
	email VARCHAR(254) NOT NULL, 
	phone VARCHAR(32) NOT NULL, 
	address VARCHAR(400) NOT NULL, 
	notes TEXT NOT NULL, 
	is_guardian BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_persons PRIMARY KEY (id), 
	CONSTRAINT uq_persons_school_id UNIQUE (school_id, cpf), 
	CONSTRAINT fk_persons_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE portal_accounts (
	email VARCHAR(254) NOT NULL, 
	password_hash VARCHAR(512) NOT NULL, 
	name VARCHAR(180) NOT NULL, 
	cpf VARCHAR(11), 
	phone VARCHAR(24) NOT NULL, 
	address VARCHAR(400) NOT NULL, 
	email_verified BOOLEAN NOT NULL, 
	phone_verified BOOLEAN NOT NULL, 
	whatsapp_opt_in BOOLEAN NOT NULL, 
	registration_consent JSON NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_portal_accounts PRIMARY KEY (id), 
	CONSTRAINT uq_portal_accounts_school_id UNIQUE (school_id, email), 
	CONSTRAINT fk_portal_accounts_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE school_access (
	user_id VARCHAR(36) NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_school_access PRIMARY KEY (user_id, school_id), 
	CONSTRAINT fk_school_access_user_id_users FOREIGN KEY(user_id) REFERENCES users (id), 
	CONSTRAINT fk_school_access_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE shifts (
	name VARCHAR(80) NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_shifts PRIMARY KEY (id), 
	CONSTRAINT uq_shifts_school_id UNIQUE (school_id, name), 
	CONSTRAINT fk_shifts_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE units (
	name VARCHAR(160) NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_units PRIMARY KEY (id), 
	CONSTRAINT uq_units_school_id UNIQUE (school_id, name), 
	CONSTRAINT fk_units_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE class_groups (
	name VARCHAR(120) NOT NULL, 
	unit_id VARCHAR(36) NOT NULL, 
	academic_year_id VARCHAR(36) NOT NULL, 
	grade_id VARCHAR(36) NOT NULL, 
	shift_id VARCHAR(36) NOT NULL, 
	capacity INTEGER NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_class_groups PRIMARY KEY (id), 
	CONSTRAINT uq_class_groups_school_id UNIQUE (school_id, academic_year_id, unit_id, name), 
	CONSTRAINT ck_class_groups_positive_capacity CHECK (capacity > 0), 
	CONSTRAINT fk_class_groups_unit_id_units FOREIGN KEY(unit_id) REFERENCES units (id), 
	CONSTRAINT fk_class_groups_academic_year_id_academic_years FOREIGN KEY(academic_year_id) REFERENCES academic_years (id), 
	CONSTRAINT fk_class_groups_grade_id_grades FOREIGN KEY(grade_id) REFERENCES grades (id), 
	CONSTRAINT fk_class_groups_shift_id_shifts FOREIGN KEY(shift_id) REFERENCES shifts (id), 
	CONSTRAINT fk_class_groups_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE document_types (
	name VARCHAR(120) NOT NULL, 
	required BOOLEAN NOT NULL, 
	active BOOLEAN NOT NULL, 
	grade_id VARCHAR(36), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_document_types PRIMARY KEY (id), 
	CONSTRAINT uq_document_types_school_id UNIQUE (school_id, name), 
	CONSTRAINT fk_document_types_grade_id_grades FOREIGN KEY(grade_id) REFERENCES grades (id), 
	CONSTRAINT fk_document_types_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE integration_jobs (
	connection_id VARCHAR(36), 
	kind VARCHAR(32) NOT NULL, 
	dedupe_key VARCHAR(180) NOT NULL, 
	encrypted_payload TEXT NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	attempts INTEGER NOT NULL, 
	available_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	lease_until TIMESTAMP WITH TIME ZONE, 
	error_code VARCHAR(80) NOT NULL, 
	remote_id VARCHAR(160) NOT NULL, 
	delivery_status VARCHAR(32) NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_integration_jobs PRIMARY KEY (id), 
	CONSTRAINT fk_integration_jobs_connection_id_integration_connections FOREIGN KEY(connection_id) REFERENCES integration_connections (id), 
	CONSTRAINT uq_integration_jobs_dedupe_key UNIQUE (dedupe_key), 
	CONSTRAINT fk_integration_jobs_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE integration_webhooks (
	connection_id VARCHAR(36) NOT NULL, 
	event_id VARCHAR(200) NOT NULL, 
	event_type VARCHAR(80) NOT NULL, 
	payload_hash VARCHAR(64) NOT NULL, 
	remote_id VARCHAR(160) NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_integration_webhooks PRIMARY KEY (id), 
	CONSTRAINT uq_integration_webhooks_connection_id UNIQUE (connection_id, event_id), 
	CONSTRAINT fk_integration_webhooks_connection_id_integration_connections FOREIGN KEY(connection_id) REFERENCES integration_connections (id), 
	CONSTRAINT fk_integration_webhooks_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE portal_challenges (
	account_id VARCHAR(36) NOT NULL, 
	purpose VARCHAR(24) NOT NULL, 
	channel VARCHAR(16) NOT NULL, 
	code_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	attempts INTEGER NOT NULL, 
	used BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_portal_challenges PRIMARY KEY (id), 
	CONSTRAINT fk_portal_challenges_account_id_portal_accounts FOREIGN KEY(account_id) REFERENCES portal_accounts (id)
)

;

CREATE TABLE portal_sessions (
	account_id VARCHAR(36) NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	CONSTRAINT pk_portal_sessions PRIMARY KEY (id), 
	CONSTRAINT fk_portal_sessions_account_id_portal_accounts FOREIGN KEY(account_id) REFERENCES portal_accounts (id), 
	CONSTRAINT uq_portal_sessions_token_hash UNIQUE (token_hash)
)

;

CREATE TABLE students (
	person_id VARCHAR(36) NOT NULL, 
	number VARCHAR(32) NOT NULL, 
	previous_school VARCHAR(180) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_students PRIMARY KEY (id), 
	CONSTRAINT uq_students_school_id UNIQUE (school_id, number), 
	CONSTRAINT uq_students_person_id UNIQUE (person_id), 
	CONSTRAINT fk_students_person_id_persons FOREIGN KEY(person_id) REFERENCES persons (id), 
	CONSTRAINT fk_students_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE enrollments (
	student_id VARCHAR(36) NOT NULL, 
	academic_year_id VARCHAR(36) NOT NULL, 
	class_group_id VARCHAR(36) NOT NULL, 
	number VARCHAR(40) NOT NULL, 
	enrolled_on DATE NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	financial_person_id VARCHAR(36), 
	previous_enrollment_id VARCHAR(36), 
	activation_key VARCHAR(160), 
	notes TEXT NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_enrollments PRIMARY KEY (id), 
	CONSTRAINT uq_enrollments_school_id UNIQUE (school_id, number), 
	CONSTRAINT ck_enrollments_enrollment_status CHECK (status IN ('draft','active','suspended','transferred','cancelled','completed')), 
	CONSTRAINT fk_enrollments_student_id_students FOREIGN KEY(student_id) REFERENCES students (id), 
	CONSTRAINT fk_enrollments_academic_year_id_academic_years FOREIGN KEY(academic_year_id) REFERENCES academic_years (id), 
	CONSTRAINT fk_enrollments_class_group_id_class_groups FOREIGN KEY(class_group_id) REFERENCES class_groups (id), 
	CONSTRAINT fk_enrollments_financial_person_id_persons FOREIGN KEY(financial_person_id) REFERENCES persons (id), 
	CONSTRAINT fk_enrollments_previous_enrollment_id_enrollments FOREIGN KEY(previous_enrollment_id) REFERENCES enrollments (id), 
	CONSTRAINT uq_enrollments_activation_key UNIQUE (activation_key), 
	CONSTRAINT fk_enrollments_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE protocols (
	number VARCHAR(40) NOT NULL, 
	student_id VARCHAR(36), 
	kind VARCHAR(120) NOT NULL, 
	description TEXT NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	due_on DATE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_protocols PRIMARY KEY (id), 
	CONSTRAINT uq_protocols_school_id UNIQUE (school_id, number), 
	CONSTRAINT fk_protocols_student_id_students FOREIGN KEY(student_id) REFERENCES students (id), 
	CONSTRAINT fk_protocols_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE student_documents (
	student_id VARCHAR(36) NOT NULL, 
	document_type_id VARCHAR(36) NOT NULL, 
	file_id VARCHAR(36), 
	status VARCHAR(20) NOT NULL, 
	expires_on DATE, 
	notes TEXT NOT NULL, 
	validated_by VARCHAR(36), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_student_documents PRIMARY KEY (id), 
	CONSTRAINT ck_student_documents_document_status CHECK (status IN ('received','validated','rejected','waived','archived')), 
	CONSTRAINT fk_student_documents_student_id_students FOREIGN KEY(student_id) REFERENCES students (id), 
	CONSTRAINT fk_student_documents_document_type_id_document_types FOREIGN KEY(document_type_id) REFERENCES document_types (id), 
	CONSTRAINT fk_student_documents_file_id_files FOREIGN KEY(file_id) REFERENCES files (id), 
	CONSTRAINT fk_student_documents_validated_by_users FOREIGN KEY(validated_by) REFERENCES users (id), 
	CONSTRAINT fk_student_documents_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE student_guardians (
	student_id VARCHAR(36) NOT NULL, 
	person_id VARCHAR(36) NOT NULL, 
	relationship VARCHAR(60) NOT NULL, 
	legal BOOLEAN NOT NULL, 
	financial BOOLEAN NOT NULL, 
	pickup BOOLEAN NOT NULL, 
	primary_contact BOOLEAN NOT NULL, 
	active BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_student_guardians PRIMARY KEY (id), 
	CONSTRAINT uq_student_guardians_student_id UNIQUE (student_id, person_id), 
	CONSTRAINT fk_student_guardians_student_id_students FOREIGN KEY(student_id) REFERENCES students (id), 
	CONSTRAINT fk_student_guardians_person_id_persons FOREIGN KEY(person_id) REFERENCES persons (id), 
	CONSTRAINT fk_student_guardians_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE admissions (
	campaign_id VARCHAR(36) NOT NULL, 
	account_id VARCHAR(36) NOT NULL, 
	number VARCHAR(40) NOT NULL, 
	client_key VARCHAR(80) NOT NULL, 
	class_group_id VARCHAR(36) NOT NULL, 
	student_data JSON NOT NULL, 
	guardian_snapshot JSON NOT NULL, 
	relationship VARCHAR(60) NOT NULL, 
	notes TEXT NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	consent JSON NOT NULL, 
	submitted_at TIMESTAMP WITH TIME ZONE, 
	reviewed_by VARCHAR(36), 
	student_id VARCHAR(36), 
	enrollment_id VARCHAR(36), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_admissions PRIMARY KEY (id), 
	CONSTRAINT uq_admissions_school_id UNIQUE (school_id, number), 
	CONSTRAINT uq_admissions_account_id UNIQUE (account_id, client_key), 
	CONSTRAINT ck_admissions_admission_status CHECK (status IN ('draft','submitted','under_review','changes_requested','waitlisted','approved','enrolled','rejected','withdrawn')), 
	CONSTRAINT fk_admissions_campaign_id_admission_campaigns FOREIGN KEY(campaign_id) REFERENCES admission_campaigns (id), 
	CONSTRAINT fk_admissions_account_id_portal_accounts FOREIGN KEY(account_id) REFERENCES portal_accounts (id), 
	CONSTRAINT fk_admissions_class_group_id_class_groups FOREIGN KEY(class_group_id) REFERENCES class_groups (id), 
	CONSTRAINT fk_admissions_reviewed_by_users FOREIGN KEY(reviewed_by) REFERENCES users (id), 
	CONSTRAINT fk_admissions_student_id_students FOREIGN KEY(student_id) REFERENCES students (id), 
	CONSTRAINT uq_admissions_enrollment_id UNIQUE (enrollment_id), 
	CONSTRAINT fk_admissions_enrollment_id_enrollments FOREIGN KEY(enrollment_id) REFERENCES enrollments (id), 
	CONSTRAINT fk_admissions_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE enrollment_events (
	enrollment_id VARCHAR(36) NOT NULL, 
	action VARCHAR(32) NOT NULL, 
	reason VARCHAR(1000) NOT NULL, 
	before JSON NOT NULL, 
	after JSON NOT NULL, 
	actor_id VARCHAR(36) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_enrollment_events PRIMARY KEY (id), 
	CONSTRAINT fk_enrollment_events_enrollment_id_enrollments FOREIGN KEY(enrollment_id) REFERENCES enrollments (id), 
	CONSTRAINT fk_enrollment_events_actor_id_users FOREIGN KEY(actor_id) REFERENCES users (id), 
	CONSTRAINT fk_enrollment_events_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE issued_documents (
	student_id VARCHAR(36) NOT NULL, 
	enrollment_id VARCHAR(36), 
	kind VARCHAR(40) NOT NULL, 
	file_id VARCHAR(36) NOT NULL, 
	template_version VARCHAR(20) NOT NULL, 
	snapshot JSON NOT NULL, 
	created_by VARCHAR(36) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_issued_documents PRIMARY KEY (id), 
	CONSTRAINT fk_issued_documents_student_id_students FOREIGN KEY(student_id) REFERENCES students (id), 
	CONSTRAINT fk_issued_documents_enrollment_id_enrollments FOREIGN KEY(enrollment_id) REFERENCES enrollments (id), 
	CONSTRAINT fk_issued_documents_file_id_files FOREIGN KEY(file_id) REFERENCES files (id), 
	CONSTRAINT fk_issued_documents_created_by_users FOREIGN KEY(created_by) REFERENCES users (id), 
	CONSTRAINT fk_issued_documents_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE protocol_events (
	protocol_id VARCHAR(36) NOT NULL, 
	actor_id VARCHAR(36) NOT NULL, 
	action VARCHAR(24) NOT NULL, 
	message TEXT NOT NULL, 
	before JSON NOT NULL, 
	after JSON NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_protocol_events PRIMARY KEY (id), 
	CONSTRAINT fk_protocol_events_protocol_id_protocols FOREIGN KEY(protocol_id) REFERENCES protocols (id), 
	CONSTRAINT fk_protocol_events_actor_id_users FOREIGN KEY(actor_id) REFERENCES users (id), 
	CONSTRAINT fk_protocol_events_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE admission_attachments (
	admission_id VARCHAR(36) NOT NULL, 
	document_type_id VARCHAR(36) NOT NULL, 
	original_name VARCHAR(240) NOT NULL, 
	storage_key VARCHAR(200) NOT NULL, 
	mime_type VARCHAR(100) NOT NULL, 
	size INTEGER NOT NULL, 
	sha256 VARCHAR(64) NOT NULL, 
	active BOOLEAN NOT NULL, 
	review_status VARCHAR(20) NOT NULL, 
	review_note TEXT NOT NULL, 
	student_document_id VARCHAR(36), 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_admission_attachments PRIMARY KEY (id), 
	CONSTRAINT fk_admission_attachments_admission_id_admissions FOREIGN KEY(admission_id) REFERENCES admissions (id), 
	CONSTRAINT fk_admission_attachments_document_type_id_document_types FOREIGN KEY(document_type_id) REFERENCES document_types (id), 
	CONSTRAINT uq_admission_attachments_storage_key UNIQUE (storage_key), 
	CONSTRAINT fk_admission_attachments_student_document_id_student_documents FOREIGN KEY(student_document_id) REFERENCES student_documents (id), 
	CONSTRAINT fk_admission_attachments_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE admission_messages (
	admission_id VARCHAR(36) NOT NULL, 
	actor_id VARCHAR(36), 
	account_id VARCHAR(36), 
	kind VARCHAR(32) NOT NULL, 
	text TEXT NOT NULL, 
	internal BOOLEAN NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_admission_messages PRIMARY KEY (id), 
	CONSTRAINT fk_admission_messages_admission_id_admissions FOREIGN KEY(admission_id) REFERENCES admissions (id), 
	CONSTRAINT fk_admission_messages_actor_id_users FOREIGN KEY(actor_id) REFERENCES users (id), 
	CONSTRAINT fk_admission_messages_account_id_portal_accounts FOREIGN KEY(account_id) REFERENCES portal_accounts (id), 
	CONSTRAINT fk_admission_messages_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE bank_charges (
	connection_id VARCHAR(36) NOT NULL, 
	admission_id VARCHAR(36), 
	enrollment_id VARCHAR(36), 
	account_id VARCHAR(36), 
	payer_snapshot JSON NOT NULL, 
	description VARCHAR(500) NOT NULL, 
	amount NUMERIC(12, 2) NOT NULL, 
	due_on DATE NOT NULL, 
	billing_type VARCHAR(16) NOT NULL, 
	required_for_enrollment BOOLEAN NOT NULL, 
	external_reference VARCHAR(160) NOT NULL, 
	client_key VARCHAR(80) NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	remote_customer_id VARCHAR(160) NOT NULL, 
	remote_payment_id VARCHAR(160), 
	customer_attempted BOOLEAN NOT NULL, 
	payment_attempted BOOLEAN NOT NULL, 
	invoice_url TEXT NOT NULL, 
	bank_slip_url TEXT NOT NULL, 
	pix_copy_paste TEXT NOT NULL, 
	pix_image TEXT NOT NULL, 
	pix_expires_at VARCHAR(60) NOT NULL, 
	last_synced_at TIMESTAMP WITH TIME ZONE, 
	created_by VARCHAR(36) NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_bank_charges PRIMARY KEY (id), 
	CONSTRAINT uq_bank_charges_school_id UNIQUE (school_id, client_key), 
	CONSTRAINT uq_bank_charges_connection_id UNIQUE (connection_id, remote_payment_id), 
	CONSTRAINT ck_bank_charges_charge_amount CHECK (amount > 0), 
	CONSTRAINT ck_bank_charges_charge_type CHECK (billing_type IN ('PIX','BOLETO')), 
	CONSTRAINT fk_bank_charges_connection_id_integration_connections FOREIGN KEY(connection_id) REFERENCES integration_connections (id), 
	CONSTRAINT fk_bank_charges_admission_id_admissions FOREIGN KEY(admission_id) REFERENCES admissions (id), 
	CONSTRAINT fk_bank_charges_enrollment_id_enrollments FOREIGN KEY(enrollment_id) REFERENCES enrollments (id), 
	CONSTRAINT fk_bank_charges_account_id_portal_accounts FOREIGN KEY(account_id) REFERENCES portal_accounts (id), 
	CONSTRAINT uq_bank_charges_external_reference UNIQUE (external_reference), 
	CONSTRAINT fk_bank_charges_created_by_users FOREIGN KEY(created_by) REFERENCES users (id), 
	CONSTRAINT fk_bank_charges_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;

CREATE TABLE bank_events (
	charge_id VARCHAR(36) NOT NULL, 
	source VARCHAR(32) NOT NULL, 
	previous_status VARCHAR(32) NOT NULL, 
	status VARCHAR(32) NOT NULL, 
	details JSON NOT NULL, 
	id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	version INTEGER NOT NULL, 
	school_id VARCHAR(36) NOT NULL, 
	CONSTRAINT pk_bank_events PRIMARY KEY (id), 
	CONSTRAINT fk_bank_events_charge_id_bank_charges FOREIGN KEY(charge_id) REFERENCES bank_charges (id), 
	CONSTRAINT fk_bank_events_school_id_schools FOREIGN KEY(school_id) REFERENCES schools (id)
)

;