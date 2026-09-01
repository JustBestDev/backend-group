import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma.js";

const PASSWORD = "Password123!";
const SEED_EMAILS = [
  "admin@test.local",
  "owner@test.local",
  "owner2@test.local",
  "user@test.local",
  "user2@test.local",
  "suspended@test.local",
  "banned@test.local",
  "owner.pending@test.local",
  "owner.rejected@test.local",
];
const PROPERTY_TITLES = [
  "Team Test Condo",
  "Team Test Pending House",
  "Team Test Rejected Apartment",
  "Team Test Closed Dormitory",
  "Team Test Owner Two House",
];
const IMAGE_BASE = "https://placehold.co/1200x800/png?text=";

function assertDevelopmentDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Team test seed is disabled when NODE_ENV=production.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required before seeding.");

  const loweredUrl = databaseUrl.toLowerCase();
  if (/\b(prod|production)\b/.test(loweredUrl)) {
    throw new Error("Refusing to seed a DATABASE_URL that appears to be production.");
  }

  let host;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error("DATABASE_URL must be a valid connection URL.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(host) && process.env.ALLOW_TEAM_TEST_SEED !== "true") {
    throw new Error(
      "Remote database seed blocked. Set ALLOW_TEAM_TEST_SEED=true only for an approved team development database.",
    );
  }
}

const date = (value) => new Date(`${value}T00:00:00.000Z`);

async function upsertUser(data, passwordHash) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      username: data.username,
      password: passwordHash,
      role: data.role,
      status: data.status,
      profile: {
        upsert: { create: data.profile, update: data.profile },
      },
    },
    create: {
      username: data.username,
      email: data.email,
      password: passwordHash,
      role: data.role,
      status: data.status,
      profile: { create: data.profile },
    },
  });
}

async function replaceSeedOwnedData(seedUserIds) {
  const properties = await prisma.property.findMany({
    where: { ownerId: { in: seedUserIds }, title: { in: PROPERTY_TITLES } },
    select: { id: true },
  });
  const propertyIds = properties.map(({ id }) => id);

  if (propertyIds.length) {
    await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
  }

  await prisma.ownerApplication.deleteMany({
    where: { userId: { in: seedUserIds } },
  });
}

async function main() {
  assertDevelopmentDatabase();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const userDefinitions = [
    { username: "admin_test", email: "admin@test.local", role: "ADMIN", status: "ACTIVE", profile: { firstName: "Team", lastName: "Admin", phone: "0800000001", bio: "Development administrator", gender: "OTHER", birthdate: date("1990-01-15"), occupation: "Administrator", currentAddress: "Bangkok", isVerified: true } },
    { username: "owner_test", email: "owner@test.local", role: "OWNER", status: "ACTIVE", profile: { firstName: "Anan", lastName: "Owner", phone: "0800000002", bio: "Primary property owner for team testing", gender: "MALE", birthdate: date("1987-05-20"), occupation: "Property Manager", currentAddress: "Pathum Wan, Bangkok", isVerified: true } },
    { username: "owner_two", email: "owner2@test.local", role: "OWNER", status: "ACTIVE", profile: { firstName: "Malee", lastName: "Owner", phone: "0800000003", bio: "Secondary owner for authorization tests", gender: "FEMALE", occupation: "Business Owner", currentAddress: "Mueang Chiang Mai, Chiang Mai", isVerified: true } },
    { username: "user_test", email: "user@test.local", role: "USER", status: "ACTIVE", profile: { firstName: "Narin", lastName: "Tester", phone: "0800000004", bio: "Looking for a room near work", gender: "MALE", birthdate: date("1998-03-12"), occupation: "Developer", currentAddress: "Bangkok", isVerified: true } },
    { username: "user_two", email: "user2@test.local", role: "USER", status: "ACTIVE", profile: { firstName: "Pim", occupation: "Designer", isVerified: false } },
    { username: "suspended_test", email: "suspended@test.local", role: "USER", status: "SUSPENDED", profile: { firstName: "Suspended", isVerified: false } },
    { username: "banned_test", email: "banned@test.local", role: "USER", status: "BANNED", profile: { firstName: "Banned", isVerified: false } },
    { username: "owner_pending", email: "owner.pending@test.local", role: "USER", status: "ACTIVE", profile: { firstName: "Pending", lastName: "Applicant", occupation: "Freelancer", isVerified: false } },
    { username: "owner_rejected", email: "owner.rejected@test.local", role: "USER", status: "ACTIVE", profile: { firstName: "Rejected", lastName: "Applicant", isVerified: false } },
  ];

  const users = {};
  for (const definition of userDefinitions) {
    users[definition.email] = await upsertUser(definition, passwordHash);
  }

  await replaceSeedOwnedData(SEED_EMAILS.map((email) => users[email].id));
  const admin = users["admin@test.local"];
  const owner = users["owner@test.local"];
  const ownerTwo = users["owner2@test.local"];
  const user = users["user@test.local"];
  const userTwo = users["user2@test.local"];
  const pendingApplicant = users["owner.pending@test.local"];
  const rejectedApplicant = users["owner.rejected@test.local"];

  await prisma.ownerApplication.createMany({ data: [
    { userId: pendingApplicant.id, status: "PENDING", documentUrl: "https://example.com/team-test/pending-owner.pdf" },
    { userId: owner.id, reviewedById: admin.id, status: "APPROVED", documentUrl: "https://example.com/team-test/approved-owner.pdf", reviewedAt: date("2026-08-15") },
    { userId: rejectedApplicant.id, reviewedById: admin.id, status: "REJECTED", documentUrl: "https://example.com/team-test/rejected-owner.pdf", rejectReason: "Identity document is incomplete", reviewedAt: date("2026-08-16") },
  ] });

  const propertyA = await prisma.property.create({ data: {
    ownerId: owner.id, title: PROPERTY_TITLES[0], description: "Approved condominium with several room states for shared team testing.", propertyType: "CONDO", rentType: "INDIVIDUAL_ROOM", monthlyRent: 8500, deposit: 17000, availableDate: date("2026-01-01"), totalBedrooms: 3, publishStatus: "APPROVED", propertyStatus: "AVAILABLE",
    address: { create: { province: "Bangkok", district: "Pathum Wan", subDistrict: "Lumphini", postcode: "10330", road: "Rama I", building: "Team Test Residence", latitude: 13.7466, longitude: 100.5347 } },
    images: { create: [
      { imageUrl: `${IMAGE_BASE}Team+Test+Condo+Cover`, isCover: true },
      { imageUrl: `${IMAGE_BASE}Team+Test+Condo+Lobby` },
      { imageUrl: `${IMAGE_BASE}Team+Test+Condo+Exterior` },
    ] },
    rooms: { create: [
      { roomName: "Room A", description: "Single room with complete image state", monthlyRent: 7500, status: "AVAILABLE", capacity: 1, images: { create: [{ imageUrl: `${IMAGE_BASE}Room+A+Cover`, isCover: true }, { imageUrl: `${IMAGE_BASE}Room+A+Interior` }] } },
      { roomName: "Room B", description: "Shared room", monthlyRent: 9000, status: "AVAILABLE", capacity: 2, images: { create: [{ imageUrl: `${IMAGE_BASE}Room+B`, isCover: true }] } },
      { roomName: "Room C", description: "Currently rented; intentionally has no images", monthlyRent: 10000, status: "RENTED", capacity: 2 },
    ] },
  }, include: { rooms: true } });

  await prisma.property.create({ data: { ownerId: owner.id, title: PROPERTY_TITLES[1], description: "House awaiting admin publication review.", propertyType: "HOUSE", rentType: "WHOLE_UNIT", monthlyRent: 22000, deposit: 44000, totalBedrooms: 3, publishStatus: "PENDING", propertyStatus: "AVAILABLE", address: { create: { province: "Nonthaburi", district: "Pak Kret", postcode: "11120", latitude: 13.9125, longitude: 100.4983 } }, images: { create: { imageUrl: `${IMAGE_BASE}Pending+House`, isCover: true } } } });
  await prisma.property.create({ data: { ownerId: owner.id, title: PROPERTY_TITLES[2], description: "Rejected listing retained for admin UI testing.", propertyType: "APARTMENT", rentType: "INDIVIDUAL_ROOM", monthlyRent: 6000, totalBedrooms: 8, publishStatus: "REJECTED", propertyStatus: "AVAILABLE", rejectReason: "Address evidence and property photos are incomplete" } });
  await prisma.property.create({ data: { ownerId: owner.id, title: PROPERTY_TITLES[3], description: "Approved property closed by its owner.", propertyType: "DORMITORY", rentType: "WHOLE_UNIT", monthlyRent: 14500, totalBedrooms: 2, publishStatus: "APPROVED", propertyStatus: "CLOSED", address: { create: { province: "Chon Buri", district: "Bang Lamung", postcode: "20150" } } } });
  const propertyE = await prisma.property.create({ data: { ownerId: ownerTwo.id, title: PROPERTY_TITLES[4], description: "Secondary owner's approved property for authorization checks.", propertyType: "HOUSE", rentType: "INDIVIDUAL_ROOM", monthlyRent: 7200, deposit: 7200, totalBedrooms: 1, publishStatus: "APPROVED", propertyStatus: "AVAILABLE", address: { create: { province: "Chiang Mai", district: "Mueang Chiang Mai", postcode: "50000", latitude: 18.7883, longitude: 98.9853 } }, images: { create: { imageUrl: `${IMAGE_BASE}Owner+Two+House`, isCover: true } }, rooms: { create: { roomName: "Owner Two Room", description: "Ownership authorization test room", monthlyRent: 7200, status: "AVAILABLE", capacity: 2 } } }, include: { rooms: true } });

  const posts = [];
  for (const data of [
    { propertyId: propertyA.id, creatorId: user.id, title: "Team Test Open Community", description: "Open group looking for one more housemate.", requiredMembers: 3, status: "OPEN" },
    { propertyId: propertyA.id, creatorId: userTwo.id, title: "Team Test Full Community", description: "A full group for UI state testing.", requiredMembers: 2, status: "FULL" },
    { propertyId: propertyA.id, creatorId: owner.id, title: "Team Test Closed Community", description: "A closed community post.", requiredMembers: 3, status: "CLOSED" },
  ]) posts.push(await prisma.communityPost.create({ data }));

  await prisma.communityMember.createMany({ data: [
    { communityPostId: posts[0].id, userId: user.id, memberRole: "CREATOR" },
    { communityPostId: posts[0].id, userId: userTwo.id, memberRole: "MEMBER" },
    { communityPostId: posts[1].id, userId: userTwo.id, memberRole: "CREATOR" },
    { communityPostId: posts[1].id, userId: user.id, memberRole: "MEMBER" },
    { communityPostId: posts[2].id, userId: owner.id, memberRole: "CREATOR" },
  ] });
  await prisma.joinRequest.createMany({ data: [
    { communityPostId: posts[0].id, userId: pendingApplicant.id, status: "PENDING", message: "May I join this group?" },
    { communityPostId: posts[0].id, userId: userTwo.id, status: "ACCEPTED", message: "I am interested in Room B.", reviewedAt: date("2026-08-20") },
    { communityPostId: posts[0].id, userId: rejectedApplicant.id, status: "REJECTED", message: "I would like to join.", reviewedAt: date("2026-08-21") },
  ] });

  await prisma.conversation.create({ data: { propertyId: propertyA.id, members: { create: [{ userId: owner.id }, { userId: user.id }] }, messages: { create: [
    { senderId: user.id, message: "Hello, is Room A still available?", isRead: true, createdAt: new Date("2026-08-25T09:00:00.000Z") },
    { senderId: owner.id, message: "Yes, it is available for viewing this weekend.", isRead: true, createdAt: new Date("2026-08-25T09:05:00.000Z") },
    { senderId: user.id, message: "Great, may I visit on Saturday morning?", isRead: false, createdAt: new Date("2026-08-25T09:10:00.000Z") },
  ] } } });

  const roomA = propertyA.rooms.find(({ roomName }) => roomName === "Room A");
  const roomB = propertyA.rooms.find(({ roomName }) => roomName === "Room B");
  const roomC = propertyA.rooms.find(({ roomName }) => roomName === "Room C");
  const ownerTwoRoom = propertyE.rooms[0];
  for (const rental of [
    { propertyId: propertyA.id, roomId: roomC.id, ownerId: owner.id, startDate: date("2026-08-01"), monthlyRent: 10000, status: "ACTIVE", memberId: user.id },
    { propertyId: propertyE.id, roomId: ownerTwoRoom.id, ownerId: ownerTwo.id, startDate: date("2026-10-01"), monthlyRent: 7200, status: "PENDING", memberId: userTwo.id },
    { propertyId: propertyA.id, roomId: roomA.id, ownerId: owner.id, startDate: date("2026-01-01"), endDate: date("2026-06-30"), monthlyRent: 7500, status: "COMPLETED", memberId: userTwo.id },
    { propertyId: propertyA.id, roomId: roomB.id, ownerId: owner.id, startDate: date("2026-07-01"), endDate: date("2026-07-02"), monthlyRent: 9000, status: "CANCELLED", memberId: user.id },
  ]) await prisma.rental.create({ data: { propertyId: rental.propertyId, roomId: rental.roomId, ownerId: rental.ownerId, startDate: rental.startDate, endDate: rental.endDate, monthlyRent: rental.monthlyRent, status: rental.status, members: { create: { userId: rental.memberId } } } });
  await prisma.room.update({ where: { id: ownerTwoRoom.id }, data: { status: "RESERVED" } });

  const counts = await Promise.all([
    prisma.user.count({ where: { email: { in: SEED_EMAILS } } }),
    prisma.property.count({ where: { title: { in: PROPERTY_TITLES }, ownerId: { in: [owner.id, ownerTwo.id] } } }),
    prisma.room.count({ where: { propertyId: { in: [propertyA.id, propertyE.id] } } }),
    prisma.communityPost.count({ where: { propertyId: propertyA.id } }),
    prisma.joinRequest.count({ where: { communityPostId: { in: posts.map(({ id }) => id) } } }),
    prisma.conversation.count({ where: { propertyId: propertyA.id } }),
    prisma.message.count({ where: { conversation: { propertyId: propertyA.id } } }),
    prisma.rental.count({ where: { propertyId: { in: [propertyA.id, propertyE.id] } } }),
  ]);

  console.log(`\nTeam test seed completed.\n\nDEVELOPMENT TEST ACCOUNTS ONLY\nADMIN  admin@test.local\nOWNER  owner@test.local\nOWNER2 owner2@test.local\nUSER   user@test.local\nUSER2  user2@test.local\nSUSPENDED suspended@test.local\nBANNED banned@test.local\n\nPassword:\n${PASSWORD}\n\nPrimary test data:\nOwner: owner@test.local\nProperty: Team Test Condo\nRooms: Room A, Room B, Room C\n\nSeeded:\nUsers: ${counts[0]}\nProperties: ${counts[1]}\nRooms: ${counts[2]}\nCommunity Posts: ${counts[3]}\nJoin Requests: ${counts[4]}\nConversations: ${counts[5]}\nMessages: ${counts[6]}\nRentals: ${counts[7]}\n`);
}

main()
  .catch((error) => {
    console.error("Team test seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
