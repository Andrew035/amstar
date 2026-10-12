-- Two optional fields the shop asked for: the customer's phone number, so a car
-- can be called about, and the odometer reading at drop-off.
--
-- customers.phone already exists from V1; only the write path was missing, so
-- there is nothing to add for it here.
--
-- mileage lives on the vehicle and holds the MOST RECENT reading, not a history.
-- Unlike make or VIN, which are facts about the car that need filling in once,
-- it changes every visit, so the assembly takes whatever was entered rather than
-- only filling a blank. A per-visit record would belong on service_tickets; the
-- shop asked for the mileage of the vehicle, and the latest figure is what they
-- read off the dash.
alter table vehicles add column mileage integer;

-- Upper bound catches a fat-fingered extra digit. The highest reading ever
-- verified on a car is a little over three million miles, so anything past that
-- is a typo, not a truck.
alter table vehicles add constraint vehicles_mileage_sane
  check (mileage is null or mileage between 0 and 3000000);
