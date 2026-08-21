--
-- PostgreSQL database dump
--

\restrict t5mwjasd0edTHRExEegnYjlHwP8bBBHvBbiXKRHNGxln1akAZQ69TjR0cCtRpns

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    activity_log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action_type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: animal_intakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.animal_intakes (
    intake_id uuid DEFAULT gen_random_uuid() NOT NULL,
    animal_id uuid NOT NULL,
    intake_date date NOT NULL,
    intake_category character varying(25) NOT NULL,
    intake_source character varying(25) NOT NULL,
    found_location character varying(255),
    age_at_intake character varying(50),
    observed_condition text,
    rescued_by_user_id uuid,
    outside_rescuer_name character varying(100),
    outside_rescuer_contact character varying(100),
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_intake_category CHECK (((intake_category)::text = ANY ((ARRAY['RESCUE'::character varying, 'SURRENDERED'::character varying, 'ABANDONED_DUMPED'::character varying, 'ADOPTION_RETURN'::character varying, 'TRANSFER'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT chk_intake_date CHECK ((intake_date <= CURRENT_DATE)),
    CONSTRAINT chk_intake_source CHECK (((intake_source)::text = ANY ((ARRAY['MNP_VOLUNTEER'::character varying, 'OUTSIDE_PERSON'::character varying, 'FOUND_BY_MNP'::character varying, 'UNKNOWN'::character varying, 'OTHER'::character varying])::text[])))
);


--
-- Name: animals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.animals (
    animal_id uuid DEFAULT gen_random_uuid() NOT NULL,
    animal_code character varying(30) NOT NULL,
    animal_name character varying(50),
    species character varying(10) NOT NULL,
    breed character varying(100),
    life_stage character varying(20) NOT NULL,
    sex character varying(10) NOT NULL,
    collar_color character varying(20),
    birth_date date,
    birth_date_is_estimated boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    health_status character varying(25) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    adoption_status character varying(20) DEFAULT 'NOT_READY'::character varying NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_adoption_status CHECK (((adoption_status)::text = ANY ((ARRAY['NOT_READY'::character varying, 'AVAILABLE'::character varying, 'RESERVED'::character varying, 'ADOPTED'::character varying, 'RETURNED'::character varying])::text[]))),
    CONSTRAINT chk_animal_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ADOPTED'::character varying, 'PASSED_AWAY'::character varying, 'MISSING'::character varying, 'ESCAPED'::character varying])::text[]))),
    CONSTRAINT chk_estimated_birth_date CHECK (((birth_date IS NOT NULL) OR (birth_date_is_estimated = false))),
    CONSTRAINT chk_health_status CHECK (((health_status)::text = ANY ((ARRAY['HEALTHY'::character varying, 'SICK'::character varying, 'INJURED'::character varying, 'UNDER_OBSERVATION'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT chk_life_stage CHECK (((life_stage)::text = ANY ((ARRAY['BABY'::character varying, 'JUVENILE'::character varying, 'ADULT'::character varying, 'SENIOR'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT chk_sex CHECK (((sex)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying])::text[]))),
    CONSTRAINT chk_species CHECK (((species)::text = ANY ((ARRAY['CAT'::character varying, 'DOG'::character varying])::text[])))
);


--
-- Name: cage_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cage_assignments (
    assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    animal_id uuid NOT NULL,
    cage_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    assigned_by uuid,
    removed_at timestamp with time zone,
    removed_by uuid,
    reason text,
    CONSTRAINT chk_assignment_dates CHECK (((removed_at IS NULL) OR (removed_at >= assigned_at)))
);


--
-- Name: cages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cages (
    cage_id uuid DEFAULT gen_random_uuid() NOT NULL,
    cage_code character varying(20) NOT NULL,
    species_group character varying(10) NOT NULL,
    gender_group character varying(10) NOT NULL,
    recommended_capacity integer NOT NULL,
    cage_type character varying(20) DEFAULT 'NORMAL'::character varying NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    location character varying(100),
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT cages_cage_type_check CHECK (((cage_type)::text = ANY ((ARRAY['NORMAL'::character varying, 'ISOLATION'::character varying, 'TEMPORARY'::character varying])::text[]))),
    CONSTRAINT cages_gender_group_check CHECK (((gender_group)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying, 'MIXED'::character varying])::text[]))),
    CONSTRAINT cages_recommended_capacity_check CHECK ((recommended_capacity > 0)),
    CONSTRAINT cages_species_group_check CHECK (((species_group)::text = ANY ((ARRAY['CAT'::character varying, 'DOG'::character varying, 'MIXED'::character varying])::text[]))),
    CONSTRAINT cages_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'PLANNED'::character varying])::text[])))
);


--
-- Name: care_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_records (
    care_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
    cage_id uuid NOT NULL,
    care_date date NOT NULL,
    care_period character varying(10) NOT NULL,
    care_type character varying(20) NOT NULL,
    cleaning_type character varying(20),
    status character varying(15) DEFAULT 'PENDING'::character varying NOT NULL,
    completed_by uuid,
    completed_at timestamp with time zone,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_care_completion CHECK (((((status)::text = 'PENDING'::text) AND (completed_at IS NULL)) OR (((status)::text = 'COMPLETED'::text) AND (completed_at IS NOT NULL)))),
    CONSTRAINT chk_care_period CHECK (((care_period)::text = ANY ((ARRAY['AM'::character varying, 'PM'::character varying, 'EXTRA'::character varying])::text[]))),
    CONSTRAINT chk_care_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'COMPLETED'::character varying])::text[]))),
    CONSTRAINT chk_care_type CHECK (((care_type)::text = ANY ((ARRAY['FEEDING'::character varying, 'CLEANING'::character varying, 'RELIEF_BREAK'::character varying])::text[]))),
    CONSTRAINT chk_cleaning_type CHECK (((((care_type)::text = 'CLEANING'::text) AND ((cleaning_type)::text = ANY ((ARRAY['LITTER_BOX'::character varying, 'FULL_CAGE'::character varying])::text[]))) OR (((care_type)::text <> 'CLEANING'::text) AND (cleaning_type IS NULL))))
);


--
-- Name: donation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation_items (
    donation_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    donation_id uuid NOT NULL,
    inventory_item_id uuid,
    item_name character varying(150) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(30) NOT NULL,
    notes text,
    CONSTRAINT chk_donation_item_quantity CHECK ((quantity > (0)::numeric))
);


--
-- Name: donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donations (
    donation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    donation_type character varying(20) NOT NULL,
    donation_date date NOT NULL,
    monetary_amount numeric(12,2),
    payment_method character varying(20),
    payment_provider character varying(100),
    donor_name character varying(150),
    donor_contact character varying(100),
    is_anonymous boolean DEFAULT false NOT NULL,
    purpose text,
    notes text,
    received_by uuid,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_donation_amount CHECK (((((donation_type)::text = ANY ((ARRAY['MONETARY'::character varying, 'DIRECT_PAYMENT'::character varying])::text[])) AND (monetary_amount IS NOT NULL) AND (monetary_amount > (0)::numeric)) OR (((donation_type)::text = 'IN_KIND'::text) AND ((monetary_amount IS NULL) OR (monetary_amount > (0)::numeric))))),
    CONSTRAINT chk_donation_date CHECK ((donation_date <= CURRENT_DATE)),
    CONSTRAINT chk_donation_payment_method CHECK (((payment_method IS NULL) OR ((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'E_WALLET'::character varying, 'BANK_TRANSFER'::character varying, 'OTHER'::character varying])::text[])))),
    CONSTRAINT chk_donation_type CHECK (((donation_type)::text = ANY ((ARRAY['MONETARY'::character varying, 'IN_KIND'::character varying, 'DIRECT_PAYMENT'::character varying])::text[])))
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    expense_id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_date date NOT NULL,
    category character varying(30) NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    animal_id uuid,
    medical_record_id uuid,
    paid_by_user_id uuid,
    payment_source character varying(30) NOT NULL,
    payment_method character varying(20) NOT NULL,
    receipt text,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_expense_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT chk_expense_category CHECK (((category)::text = ANY ((ARRAY['VET'::character varying, 'MEDICINE'::character varying, 'FOOD'::character varying, 'LITTER'::character varying, 'CAGE_SUPPLIES'::character varying, 'CLEANING_SUPPLIES'::character varying, 'TRANSPORTATION'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT chk_expense_date CHECK ((expense_date <= CURRENT_DATE)),
    CONSTRAINT chk_expense_payment_method CHECK (((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'GCASH'::character varying, 'BANK_TRANSFER'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT chk_expense_payment_source CHECK (((payment_source)::text = ANY ((ARRAY['MNP_SHELTER_FUND'::character varying, 'PERSONAL_CONTRIBUTION'::character varying, 'PERSONAL_ADVANCE'::character varying, 'DIRECT_SPONSOR_PAYMENT'::character varying])::text[])))
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    inventory_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_name character varying(150) NOT NULL,
    variant character varying(150),
    item_type character varying(20) NOT NULL,
    category character varying(30) NOT NULL,
    package_size numeric(10,2),
    package_size_unit character varying(10),
    unit character varying(30),
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_inventory_category CHECK (((category)::text = ANY ((ARRAY['CAT_FOOD'::character varying, 'DOG_FOOD'::character varying, 'CAT_LITTER'::character varying, 'CLEANING_SUPPLY'::character varying, 'MEDICAL_SUPPLY'::character varying, 'CAGE_SUPPLY'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT chk_inventory_item_type CHECK (((item_type)::text = ANY ((ARRAY['FOOD'::character varying, 'SUPPLY'::character varying])::text[]))),
    CONSTRAINT chk_inventory_package_size CHECK (((package_size IS NULL) OR (package_size > (0)::numeric))),
    CONSTRAINT chk_inventory_package_size_unit CHECK ((((package_size IS NULL) AND (package_size_unit IS NULL)) OR ((package_size IS NOT NULL) AND (package_size_unit IS NOT NULL))))
);


--
-- Name: inventory_stock_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_stock_records (
    stock_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
    inventory_item_id uuid NOT NULL,
    record_type character varying(20) NOT NULL,
    quantity numeric(10,2),
    adjustment_direction character varying(10),
    estimated_level character varying(20),
    stock_status character varying(10),
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_adjustment_direction CHECK (((((record_type)::text = 'ADJUSTMENT'::text) AND ((adjustment_direction)::text = ANY ((ARRAY['ADD'::character varying, 'REMOVE'::character varying])::text[]))) OR (((record_type)::text <> 'ADJUSTMENT'::text) AND (adjustment_direction IS NULL)))),
    CONSTRAINT chk_estimated_level CHECK (((estimated_level IS NULL) OR ((estimated_level)::text = ANY ((ARRAY['FULL'::character varying, 'THREE_QUARTERS'::character varying, 'HALF'::character varying, 'ONE_QUARTER'::character varying, 'ALMOST_EMPTY'::character varying, 'EMPTY'::character varying])::text[])))),
    CONSTRAINT chk_stock_quantity CHECK (((quantity IS NULL) OR (quantity >= (0)::numeric))),
    CONSTRAINT chk_stock_record_type CHECK (((record_type)::text = ANY ((ARRAY['RECEIVED'::character varying, 'USED'::character varying, 'ADJUSTMENT'::character varying, 'STOCK_CHECK'::character varying])::text[]))),
    CONSTRAINT chk_stock_status CHECK (((stock_status IS NULL) OR ((stock_status)::text = ANY ((ARRAY['GOOD'::character varying, 'LOW'::character varying, 'OUT'::character varying])::text[]))))
);


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    medical_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
    animal_id uuid NOT NULL,
    observation_id uuid,
    medical_type character varying(20) NOT NULL,
    medical_date date NOT NULL,
    reason text NOT NULL,
    clinic character varying(150),
    vet_name character varying(100),
    diagnosis text,
    treatment text,
    follow_up_date date,
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_medical_follow_up_date CHECK (((follow_up_date IS NULL) OR (follow_up_date >= medical_date))),
    CONSTRAINT chk_medical_type CHECK (((medical_type)::text = ANY ((ARRAY['VET_VISIT'::character varying, 'TREATMENT'::character varying, 'FOLLOW_UP'::character varying, 'OTHER'::character varying])::text[])))
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    medication_id uuid DEFAULT gen_random_uuid() NOT NULL,
    medical_record_id uuid,
    animal_id uuid NOT NULL,
    medication_name character varying(150) NOT NULL,
    dosage character varying(100),
    frequency character varying(100),
    start_date date NOT NULL,
    end_date date,
    instructions text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_medication_dates CHECK (((end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT chk_medication_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'DISCONTINUED'::character varying])::text[])))
);


--
-- Name: notification_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_recipients (
    notification_recipient_id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT chk_notification_read_status CHECK ((((is_read = false) AND (read_at IS NULL)) OR ((is_read = true) AND (read_at IS NOT NULL))))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_type character varying(50) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    title character varying(150) NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observations (
    observation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    cage_id uuid NOT NULL,
    animal_id uuid,
    observation_type character varying(30) NOT NULL,
    urgency character varying(20) DEFAULT 'NORMAL'::character varying NOT NULL,
    status character varying(30) DEFAULT 'NEW'::character varying NOT NULL,
    notes text,
    photo text,
    created_by uuid,
    handled_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT chk_observation_resolution CHECK (((((status)::text = 'RESOLVED'::text) AND (resolved_at IS NOT NULL)) OR (((status)::text <> 'RESOLVED'::text) AND (resolved_at IS NULL)))),
    CONSTRAINT chk_observation_status CHECK (((status)::text = ANY ((ARRAY['NEW'::character varying, 'BEING_HANDLED'::character varying, 'MONITORING'::character varying, 'RESOLVED'::character varying, 'ESCALATED_TO_MEDICAL'::character varying])::text[]))),
    CONSTRAINT chk_observation_type CHECK (((observation_type)::text = ANY ((ARRAY['NOT_EATING'::character varying, 'VOMITING'::character varying, 'DIARRHEA'::character varying, 'INJURY'::character varying, 'LIMPING'::character varying, 'FIGHTING'::character varying, 'EYE_NOSE_DISCHARGE'::character varying, 'UNUSUAL_BEHAVIOR'::character varying, 'CAGE_CONCERN'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT chk_observation_urgency CHECK (((urgency)::text = ANY ((ARRAY['NORMAL'::character varying, 'NEEDS_ATTENTION'::character varying, 'URGENT'::character varying])::text[])))
);


--
-- Name: preventive_care_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preventive_care_records (
    preventive_care_id uuid DEFAULT gen_random_uuid() NOT NULL,
    animal_id uuid NOT NULL,
    medical_record_id uuid,
    care_type character varying(20) NOT NULL,
    date_given date NOT NULL,
    product_name character varying(150),
    dose character varying(100),
    next_due_date date,
    clinic character varying(150),
    vet_name character varying(100),
    notes text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_preventive_care_dates CHECK (((next_due_date IS NULL) OR (next_due_date >= date_given))),
    CONSTRAINT chk_preventive_care_type CHECK (((care_type)::text = ANY ((ARRAY['VACCINATION'::character varying, 'DEWORMING'::character varying])::text[])))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(20) NOT NULL,
    CONSTRAINT roles_role_name_check CHECK (((role_name)::text ~ '^[A-Z]+$'::text))
);


--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN role_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    middle_initial character varying(5),
    last_name character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    contact_number character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_email_format CHECK (((email)::text ~~ '%@%.%'::text))
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (activity_log_id);


--
-- Name: animal_intakes animal_intakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_intakes
    ADD CONSTRAINT animal_intakes_pkey PRIMARY KEY (intake_id);


--
-- Name: animals animals_animal_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animals
    ADD CONSTRAINT animals_animal_code_key UNIQUE (animal_code);


--
-- Name: animals animals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animals
    ADD CONSTRAINT animals_pkey PRIMARY KEY (animal_id);


--
-- Name: cage_assignments cage_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage_assignments
    ADD CONSTRAINT cage_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: cages cages_cage_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cages
    ADD CONSTRAINT cages_cage_code_key UNIQUE (cage_code);


--
-- Name: cages cages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cages
    ADD CONSTRAINT cages_pkey PRIMARY KEY (cage_id);


--
-- Name: care_records care_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_records
    ADD CONSTRAINT care_records_pkey PRIMARY KEY (care_record_id);


--
-- Name: donation_items donation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_items
    ADD CONSTRAINT donation_items_pkey PRIMARY KEY (donation_item_id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (donation_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (inventory_item_id);


--
-- Name: inventory_stock_records inventory_stock_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_records
    ADD CONSTRAINT inventory_stock_records_pkey PRIMARY KEY (stock_record_id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (medical_record_id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (medication_id);


--
-- Name: notification_recipients notification_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_pkey PRIMARY KEY (notification_recipient_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: observations observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT observations_pkey PRIMARY KEY (observation_id);


--
-- Name: preventive_care_records preventive_care_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_care_records
    ADD CONSTRAINT preventive_care_records_pkey PRIMARY KEY (preventive_care_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: notification_recipients uq_notification_recipient; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT uq_notification_recipient UNIQUE (notification_id, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: uq_cage_assignments_active_animal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cage_assignments_active_animal ON public.cage_assignments USING btree (animal_id) WHERE (removed_at IS NULL);


--
-- Name: uq_care_records_scheduled_task; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_care_records_scheduled_task ON public.care_records USING btree (cage_id, care_date, care_period, care_type, COALESCE(cleaning_type, ''::character varying)) WHERE ((care_period)::text = ANY ((ARRAY['AM'::character varying, 'PM'::character varying])::text[]));


--
-- Name: activity_logs fk_activity_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: cage_assignments fk_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage_assignments
    ADD CONSTRAINT fk_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE RESTRICT;


--
-- Name: animal_intakes fk_animal_intakes_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_intakes
    ADD CONSTRAINT fk_animal_intakes_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE RESTRICT;


--
-- Name: animal_intakes fk_animal_intakes_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_intakes
    ADD CONSTRAINT fk_animal_intakes_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: animal_intakes fk_animal_intakes_rescued_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_intakes
    ADD CONSTRAINT fk_animal_intakes_rescued_by FOREIGN KEY (rescued_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: animal_intakes fk_animal_intakes_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_intakes
    ADD CONSTRAINT fk_animal_intakes_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: animals fk_animals_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animals
    ADD CONSTRAINT fk_animals_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: animals fk_animals_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animals
    ADD CONSTRAINT fk_animals_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: cage_assignments fk_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage_assignments
    ADD CONSTRAINT fk_assigned_by FOREIGN KEY (assigned_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: cage_assignments fk_cage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage_assignments
    ADD CONSTRAINT fk_cage FOREIGN KEY (cage_id) REFERENCES public.cages(cage_id) ON DELETE RESTRICT;


--
-- Name: cages fk_cages_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cages
    ADD CONSTRAINT fk_cages_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: cages fk_cages_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cages
    ADD CONSTRAINT fk_cages_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: care_records fk_care_records_cage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_records
    ADD CONSTRAINT fk_care_records_cage FOREIGN KEY (cage_id) REFERENCES public.cages(cage_id) ON DELETE RESTRICT;


--
-- Name: care_records fk_care_records_completed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_records
    ADD CONSTRAINT fk_care_records_completed_by FOREIGN KEY (completed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: care_records fk_care_records_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_records
    ADD CONSTRAINT fk_care_records_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: care_records fk_care_records_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_records
    ADD CONSTRAINT fk_care_records_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: users fk_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: donation_items fk_donation_items_donation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_items
    ADD CONSTRAINT fk_donation_items_donation FOREIGN KEY (donation_id) REFERENCES public.donations(donation_id) ON DELETE CASCADE;


--
-- Name: donation_items fk_donation_items_inventory_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_items
    ADD CONSTRAINT fk_donation_items_inventory_item FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(inventory_item_id) ON DELETE SET NULL;


--
-- Name: donations fk_donations_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: donations fk_donations_received_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_received_by FOREIGN KEY (received_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: donations fk_donations_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: expenses fk_expenses_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE SET NULL;


--
-- Name: expenses fk_expenses_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: expenses fk_expenses_medical_record; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_medical_record FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(medical_record_id) ON DELETE SET NULL;


--
-- Name: expenses fk_expenses_paid_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_paid_by FOREIGN KEY (paid_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: expenses fk_expenses_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT fk_expenses_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_items fk_inventory_items_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT fk_inventory_items_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_items fk_inventory_items_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT fk_inventory_items_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: inventory_stock_records fk_inventory_stock_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_records
    ADD CONSTRAINT fk_inventory_stock_item FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(inventory_item_id) ON DELETE RESTRICT;


--
-- Name: inventory_stock_records fk_inventory_stock_recorded_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_records
    ADD CONSTRAINT fk_inventory_stock_recorded_by FOREIGN KEY (recorded_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: medical_records fk_medical_records_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT fk_medical_records_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE RESTRICT;


--
-- Name: medical_records fk_medical_records_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT fk_medical_records_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: medical_records fk_medical_records_observation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT fk_medical_records_observation FOREIGN KEY (observation_id) REFERENCES public.observations(observation_id) ON DELETE SET NULL;


--
-- Name: medical_records fk_medical_records_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT fk_medical_records_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: medications fk_medications_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT fk_medications_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE RESTRICT;


--
-- Name: medications fk_medications_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT fk_medications_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: medications fk_medications_medical_record; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT fk_medications_medical_record FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(medical_record_id) ON DELETE SET NULL;


--
-- Name: medications fk_medications_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT fk_medications_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: notification_recipients fk_notification_recipients_notification; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT fk_notification_recipients_notification FOREIGN KEY (notification_id) REFERENCES public.notifications(notification_id) ON DELETE CASCADE;


--
-- Name: notification_recipients fk_notification_recipients_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT fk_notification_recipients_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: observations fk_observations_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE SET NULL;


--
-- Name: observations fk_observations_cage; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_cage FOREIGN KEY (cage_id) REFERENCES public.cages(cage_id) ON DELETE RESTRICT;


--
-- Name: observations fk_observations_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: observations fk_observations_handled_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_handled_by FOREIGN KEY (handled_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: observations fk_observations_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observations
    ADD CONSTRAINT fk_observations_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: preventive_care_records fk_preventive_care_animal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_care_records
    ADD CONSTRAINT fk_preventive_care_animal FOREIGN KEY (animal_id) REFERENCES public.animals(animal_id) ON DELETE RESTRICT;


--
-- Name: preventive_care_records fk_preventive_care_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_care_records
    ADD CONSTRAINT fk_preventive_care_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: preventive_care_records fk_preventive_care_medical_record; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_care_records
    ADD CONSTRAINT fk_preventive_care_medical_record FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(medical_record_id) ON DELETE SET NULL;


--
-- Name: preventive_care_records fk_preventive_care_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preventive_care_records
    ADD CONSTRAINT fk_preventive_care_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: cage_assignments fk_removed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage_assignments
    ADD CONSTRAINT fk_removed_by FOREIGN KEY (removed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: users fk_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


--
-- Name: users fk_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict t5mwjasd0edTHRExEegnYjlHwP8bBBHvBbiXKRHNGxln1akAZQ69TjR0cCtRpns

