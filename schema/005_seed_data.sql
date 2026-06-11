-- Projects
INSERT INTO projects (id, name, is_unassigned, sort_order) VALUES
  ('a0000001-0001-4000-8000-000000000001', 'Grand Ethiopian Renaissance Dam (GERD)', false, 1),
  ('a0000001-0001-4000-8000-000000000002', 'Awash-Kombolcha Highway', false, 2),
  ('a0000001-0001-4000-8000-000000000003', 'Adama-Awash Expressway', false, 3),
  ('a0000001-0001-4000-8000-000000000004', 'Koye Feche Housing Project', false, 4),
  ('a0000001-0001-4000-8000-000000000005', 'Bole Airport Expansion', false, 5),
  ('a0000001-0001-4000-8000-000000000099', 'Idle / Unassigned Managers', true, 99)
ON CONFLICT (name) DO NOTHING;

-- Project contacts (seeded after users exist - contacts don't need user FK)
INSERT INTO project_contacts (id, name, phone, email, role, project_id, avatar, sort_order) VALUES
  ('b0000001-0001-4000-8000-000000000001', 'Abebe Bekele', '+251 911 234 567', 'abebe@ecwc.gov.et', 'admin', 'a0000001-0001-4000-8000-000000000001', 'AB', 1),
  ('b0000001-0001-4000-8000-000000000002', 'Helen Tadesse', '+251 922 345 678', 'helen@ecwc.gov.et', 'maintenance', 'a0000001-0001-4000-8000-000000000001', 'HT', 2),
  ('b0000001-0001-4000-8000-000000000003', 'Dawit Yohannes', '+251 933 456 789', 'dawit@ecwc.gov.et', 'admin', 'a0000001-0001-4000-8000-000000000002', 'DY', 3),
  ('b0000001-0001-4000-8000-000000000004', 'Sara Alemu', '+251 944 567 890', 'sara@ecwc.gov.et', 'admin', 'a0000001-0001-4000-8000-000000000099', 'SA', 4)
ON CONFLICT (id) DO NOTHING;

-- Equipment (added_by set after users seeded via script update, nullable for now)
INSERT INTO equipment (id, code, name, type, project_id, capacity, status, manager_notes, registered_at) VALUES
  ('c0000001-0001-4000-8000-000000000001', 'ECWC-EQ-1001', 'CAT 320D Excavator', 'excavator', 'a0000001-0001-4000-8000-000000000001', '20 Tons', 'operational', 'Operational at GERD concrete plant sector.', NOW() - INTERVAL '10 days'),
  ('c0000001-0001-4000-8000-000000000002', 'ECWC-EQ-2045', 'Komatsu D275 Dozer', 'dozer', 'a0000001-0001-4000-8000-000000000002', '320 HP', 'operational', 'Working on clearing stage 2.', NOW() - INTERVAL '8 days'),
  ('c0000001-0001-4000-8000-000000000003', 'ECWC-EQ-3082', 'Volvo FMX Dump Truck', 'dump_truck', 'a0000001-0001-4000-8000-000000000001', '15 m³', 'under_maintenance', 'Sent to central workshop for front suspension issues.', NOW() - INTERVAL '5 days'),
  ('c0000001-0001-4000-8000-000000000004', 'ECWC-EQ-4011', 'CAT 966H Loader', 'loader', 'a0000001-0001-4000-8000-000000000002', '4.2 m³', 'idle', 'Awaiting operator assignment for next shift.', NOW() - INTERVAL '12 days')
ON CONFLICT (code) DO NOTHING;

-- Garage vehicles
INSERT INTO garage_vehicles (id, plate, model, reported_issue, manager_notes, technician, priority, stage, status, registered_at, completed_at) VALUES
  ('d0000001-0001-4000-8000-000000000001', 'AA-12345', 'CAT 320 Excavator', 'Hydraulic leak on the left arm cylinder — noticed during morning inspection.', 'Confirmed hydraulic seal failure on boom cylinder. Ordered replacement seals from supplier. ETA 2 days.', 'Dawit Y.', 'high', 'in_repair', 'in_progress', NOW() - INTERVAL '2 days', NULL),
  ('d0000001-0001-4000-8000-000000000002', 'OR-98765', 'Volvo Dump Truck', 'Brake pedal feels spongy, vehicle pulling to the left when braking.', 'Front brake pads replaced. Rear drums inspected and within tolerance. Test drive passed.', 'Helen T.', 'normal', 'completed', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
  ('d0000001-0001-4000-8000-000000000003', 'AA-55555', 'Komatsu Dozer', 'Engine losing power under load. Black smoke from exhaust. Oil consumption high.', 'Full engine overhaul required. Piston rings and cylinder liners worn. Engine disassembled.', 'Abebe B.', 'critical', 'diagnosing', 'in_progress', NOW() - INTERVAL '5 days', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO garage_progress_logs (vehicle_id, text, created_at) VALUES
  ('d0000001-0001-4000-8000-000000000001', 'Vehicle received and initial inspection done. Hydraulic system isolated.', NOW() - INTERVAL '2 days'),
  ('d0000001-0001-4000-8000-000000000001', 'Seal failure confirmed on boom cylinder. Parts ordered from Addis Ababa depot.', NOW() - INTERVAL '1 day'),
  ('d0000001-0001-4000-8000-000000000002', 'Brake system inspected. Front pads worn to 2mm — below limit.', NOW() - INTERVAL '22 hours'),
  ('d0000001-0001-4000-8000-000000000002', 'New brake pads installed. Brake fluid bled and topped up.', NOW() - INTERVAL '10 hours'),
  ('d0000001-0001-4000-8000-000000000002', 'Road test completed. Braking performance confirmed satisfactory. Vehicle cleared.', NOW() - INTERVAL '2 hours'),
  ('d0000001-0001-4000-8000-000000000003', 'Initial diagnostic: compression test failed on cylinders 3 and 4.', NOW() - INTERVAL '5 days'),
  ('d0000001-0001-4000-8000-000000000003', 'Engine disassembly started. Piston rings severely worn, cylinder liners scored.', NOW() - INTERVAL '3 days');

-- Insurance claims
INSERT INTO insurance_claims (id, plate, model, accident_date, accident_description, claim_number, insurance_provider, estimated_cost, priority, stage, status, claim_notes) VALUES
  ('e0000001-0001-4000-8000-000000000001', 'AA-34567', 'Toyota Hilux Pick-up', NOW() - INTERVAL '15 days', 'Side collision on the right door during site transit. No driver injuries reported.', 'CLM-2026-102', 'Nyala Insurance', '120,000 ETB', 'normal', 'inspection', 'open', 'Surveyor assigned: Helen K. Inspection scheduled for tomorrow morning at the central workshop.'),
  ('e0000001-0001-4000-8000-000000000002', 'OR-78901', 'Caterpillar Loader', NOW() - INTERVAL '25 days', 'Engine compartment fire triggered by electrical short circuit in dry conditions.', 'CLM-2026-098', 'Ethiopian Insurance Corp', '450,000 ETB', 'critical', 'approved', 'open', 'Claim approved by insurer. Repair parts ordered. Workshop manager Helen T. handling parts clearance.')
ON CONFLICT (claim_number) DO NOTHING;

INSERT INTO insurance_progress_logs (claim_id, text, created_at) VALUES
  ('e0000001-0001-4000-8000-000000000001', 'Accident reported at project site. Police report requested.', NOW() - INTERVAL '15 days'),
  ('e0000001-0001-4000-8000-000000000001', 'Police report and driver statement submitted to claims department.', NOW() - INTERVAL '10 days'),
  ('e0000001-0001-4000-8000-000000000002', 'Fire incident reported at Adama site. Damage report filed.', NOW() - INTERVAL '25 days'),
  ('e0000001-0001-4000-8000-000000000002', 'Insurer surveyor inspected vehicle and engine block.', NOW() - INTERVAL '20 days'),
  ('e0000001-0001-4000-8000-000000000002', 'Insurer approved 90% liability. Parts procurement initiated.', NOW() - INTERVAL '14 days');
