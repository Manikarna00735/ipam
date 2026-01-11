-- create users table
CREATE TABLE IF NOT EXISTS users (
  uuid uuid PRIMARY key default gen_random_uuid(),
  fullname varchar(255) not null,
  email varchar(255) NOT NULL UNIQUE,
  employeeId text,
  jobTitle text,
  department text,
  phone varchar(20),
  orgIds uuid[],
  assetColumns jsonb,
  profileImage text,
  role text,
  isActive boolean,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME ZONE 
)

--create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  email varchar(255) NOT NULL UNIQUE,
  industry text,
  numberOfEmployees integer,
  address text,
  phone varchar(20),
  owneruuid uuid,
  isActive boolean default true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME ZONE 
)

-- create providers table
CREATE TABLE IF NOT EXISTS providers (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tagscsv text,
  asnscsv text,
  accountcount integer,
  circuitcount integer,
  comments text,
  org_uuid uuid,
  isActive boolean default true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME zone,
  user_uuid uuid 
)

-- create regions table
CREATE TABLE IF NOT EXISTS regions (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  tagscsv text,
  sitescount integer,
  parent_uuid uuid,
  parent_name text,
  org_uuid uuid,
  isActive boolean default true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME zone,
  user_uuid uuid 
)

-- create sites table
CREATE TABLE IF NOT EXISTS sites (
  uuid uuid PRIMARY key default gen_random_uuid(),
  name text not null,
  slug text not null,
  "group" text,
  description text,
  asn text,
  tagscsv text,
  tenant text,
  tenantgroup text,
  timezone text,
  region text,
  location text,
  facility text,
  physicaladdress text,
  shippingaddress text,
  orgid varchar(128),
  comments text,
  status boolean,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updatedAt TIMESTAMP WITH TIME zone,
  user_id varchar(128) 
)