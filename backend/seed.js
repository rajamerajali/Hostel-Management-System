require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Room = require('./models/Room');
const Complaint = require('./models/Complaint');
const { Visitor, Fee, Announcement } = require('./models/Other');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  await Promise.all([
    User.deleteMany({}), Room.deleteMany({}),
    Complaint.deleteMany({}), Visitor.deleteMany({}),
    Fee.deleteMany({}), Announcement.deleteMany({}),
  ]);

  const users = await User.create([
    { name:'Admin User',    email:'admin@hostel.edu',  password:'Admin@123',   role:'admin' },
    { name:'Dr. R. Sharma', email:'warden@hostel.edu', password:'Warden@123',  role:'warden' },
    { name:'Arjun Mehta',   email:'arjun@edu.in',      password:'Student@123', role:'student', rollNo:'22CS001', room:'A-101', block:'A', branch:'Computer Science', year:2, phone:'9876543210', feeStatus:'paid', attendance:94 },
    { name:'Priya Sharma',  email:'priya@edu.in',      password:'Student@123', role:'student', rollNo:'22EC002', room:'B-102', block:'B', branch:'Electronics', year:2, phone:'9876543211', feeStatus:'due', attendance:88 },
    { name:'Rahul Kumar',   email:'rahul@edu.in',      password:'Student@123', role:'student', rollNo:'21ME003', room:'A-102', block:'A', branch:'Mechanical', year:3, phone:'9876543212', feeStatus:'paid', attendance:76 },
    { name:'Sneha Patel',   email:'sneha@edu.in',      password:'Student@123', role:'student', rollNo:'23CS004', room:'C-201', block:'C', branch:'Computer Science', year:1, phone:'9876543213', feeStatus:'partial', attendance:92 },
    { name:'Vikram Singh',  email:'vikram@edu.in',     password:'Student@123', role:'student', rollNo:'22CE005', room:'B-103', block:'B', branch:'Civil Engg', year:2, phone:'9876543214', feeStatus:'paid', attendance:85 },
    { name:'Ananya Roy',    email:'ananya@edu.in',     password:'Student@123', role:'student', rollNo:'21EE006', room:'D-301', block:'D', branch:'Electrical', year:3, phone:'9876543215', feeStatus:'due', attendance:79 },
    { name:'Rohan Gupta',   email:'rohan@edu.in',      password:'Student@123', role:'student', rollNo:'23AI007', room:'C-202', block:'C', branch:'AI & ML', year:1, phone:'9876543216', feeStatus:'paid', attendance:97 },
    { name:'Kavya Nair',    email:'kavya@edu.in',      password:'Student@123', role:'student', rollNo:'22CS008', room:'A-104', block:'A', branch:'Computer Science', year:2, phone:'9876543217', feeStatus:'paid', attendance:91 },
  ]);
  console.log(`  ✅ ${users.length} users created`);

  const blocks = ['A','B','C','D'];
  const roomData = [];
  blocks.forEach((block, bi) => {
    for (let i = 0; i < 12; i++) {
      const type = ['Single','Double','Triple'][i % 3];
      const cap  = [1,2,3][i % 3];
      roomData.push({
        number: `${block}-${101 + i}`,
        block, floor: Math.floor(i / 4) + 1,
        type, capacity: cap,
        occupied: i % 7 === 0 ? 0 : Math.min(cap, Math.floor(cap * 0.8)),
        status: i % 11 === 10 ? 'maintenance' : i % 7 === 0 ? 'available' : 'occupied',
        amenities: ['WiFi', ...(i % 3 > 0 ? ['AC'] : []), ...(i % 2 === 0 ? ['Attached Bath'] : [])],
        rent: [8500, 7000, 5500][i % 3],
      });
    }
  });
  const rooms = await Room.create(roomData);
  console.log(`  ✅ ${rooms.length} rooms created`);

  const students = users.filter(u => u.role === 'student');
  const complaints = await Complaint.create([
    { student:students[0]._id, room:'A-101', title:'Water Leakage in Bathroom', description:'Continuous water leakage from pipe.', category:'Plumbing', priority:'High', status:'In Progress' },
    { student:students[1]._id, room:'B-102', title:'WiFi Connectivity Issue', description:'Weak signal in Block B.', category:'IT', priority:'Medium', status:'Resolved' },
    { student:students[2]._id, room:'A-102', title:'AC Not Working', description:'Air conditioner stopped.', category:'Electrical', priority:'High', status:'Pending' },
    { student:students[5]._id, room:'D-301', title:'Door Lock Broken', description:'Main door lock faulty.', category:'Maintenance', priority:'Critical', status:'In Progress' },
    { student:students[7]._id, room:'A-104', title:'Cafeteria Food Quality', description:'Quality declined recently.', category:'Food', priority:'Low', status:'Resolved' },
    { student:students[4]._id, room:'B-103', title:'Washing Machine Fault', description:'Machine not spinning.', category:'Appliances', priority:'Medium', status:'Pending' },
  ]);
  console.log(`  ✅ ${complaints.length} complaints created`);

  await Visitor.create([
    { name:'Mr. Rajesh Mehta', phone:'9811234567', purpose:'Parent Visit', student:students[0]._id, room:'A-101', entryTime:new Date(), exitTime:new Date(), status:'completed' },
    { name:'Ms. Sunita Sharma', phone:'9811234568', purpose:'Parent Visit', student:students[1]._id, room:'B-102', entryTime:new Date(), status:'inside' },
    { name:'Dr. Anil Kumar', phone:'9811234569', purpose:'Guardian', student:students[2]._id, room:'A-102', status:'pending' },
    { name:'Ms. Pooja Roy', phone:'9811234570', purpose:'Sibling', student:students[5]._id, room:'D-301', entryTime:new Date(), exitTime:new Date(), status:'completed' },
  ]);
  console.log(`  ✅ Visitors created`);

  const feeRecords = [];
  students.forEach(s => {
    feeRecords.push({
      student: s._id,
      month: 'January',
      year: 2025,
      amount: 42000,
      type: 'Semester',
      status: s.feeStatus === 'paid' ? 'paid' : 'pending',
      dueDate: new Date('2025-01-31'),
      paidAt: s.feeStatus === 'paid' ? new Date() : undefined,
    });
  });
  await Fee.create(feeRecords);
  console.log(`  ✅ Fee records created`);

  const warden = users.find(u => u.role === 'warden');
  await Announcement.create([
    { title:'Hostel Day Celebration 2025', content:'Annual hostel day on Feb 15th. All students must participate. Cultural performances, sports, and prize distribution.', category:'Event', priority:'high', author:warden._id, pinned:true },
    { title:'Fee Payment Deadline – Jan 31', content:'Last date for semester hostel fee is Jan 31. Late fine ₹500/week applies after deadline.', category:'Finance', priority:'urgent', author:warden._id, pinned:true },
    { title:'Mess Menu Change – February', content:'New mess menu effective Feb 1st. Special diet options now available on request at the mess counter.', category:'Mess', priority:'normal', author:warden._id },
    { title:'Night Curfew Reminder', content:'All residents must return by 10:00 PM. Strict action against violators. Parents will be informed.', category:'Rules', priority:'high', author:warden._id },
  ]);
  console.log(`  ✅ Announcements created`);

  console.log('\n✨ Database seeded successfully!\n');
  console.log('📋 Demo Login Credentials:');
  console.log('  Admin:   admin@hostel.edu   / Admin@123');
  console.log('  Warden:  warden@hostel.edu  / Warden@123');
  console.log('  Student: arjun@edu.in       / Student@123\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });