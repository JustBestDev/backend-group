import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma.js";

/**
 * RoomHub presentation seed
 * -------------------------
 * - Fictional listings and people for demo/presentation use.
 * - Property/profile photos are free stock photos from Pexels.
 * - Keeps the normal prisma/seed.js untouched.
 *
 * Run:
 *   node prisma/seed.presentation.js
 */

const PASSWORD = "RoomHubDemo123!";

const DEMO_EMAILS = [
  "admin@demo.roomhub.local",
  "owner.sukhumvit@demo.roomhub.local",
  "owner.local@demo.roomhub.local",
  "narin@demo.roomhub.local",
  "pim@demo.roomhub.local",
  "mint@demo.roomhub.local",
  "beam@demo.roomhub.local",
  "june@demo.roomhub.local",
  "ton@demo.roomhub.local",
  "fah@demo.roomhub.local",
  "boss@demo.roomhub.local",
];

const DEMO_PROPERTY_TITLES = [
  "Sukhumvit Grove Residence",
  "Phrom Phong Parkside",
  "Ari Garden Loft",
  "Ratchada City Rooms",
  "On Nut Urban Home",
  "Bang Na Shared House",
  "Riverstone Townhome",
  "Central Studio Listing",
];

const PEXELS = (id, width = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

const STOCK = {
  condoExterior: PEXELS(5033768),
  condoExterior2: PEXELS(20852247),
  condoExterior3: PEXELS(36355688),
  livingCity: PEXELS(29953440),
  livingWarm: PEXELS(7534275),
  livingNeutral: PEXELS(7214166),
  livingCozy: PEXELS(6588599),
  livingBright: PEXELS(6186821),
  bedroomLight: PEXELS(7545787),
  bedroomDesk: PEXELS(6636298),
  bedroomElegant: PEXELS(7214167),
  bedroomLuxury: PEXELS(7167067),
  bedroomModern: PEXELS(19991829),
  bedroomGlass: PEXELS(6903156),
  ownerMale: PEXELS(31268612, 700),
  ownerFemale: PEXELS(35764275, 700),
  userMale: PEXELS(34970889, 700),
  userMale2: PEXELS(17070258, 700),
  userFemale: PEXELS(35754358, 700),
  userFemale2: PEXELS(35764281, 700),
  userFemale3: PEXELS(35754345, 700),
};

const date = (value) => new Date(`${value}T00:00:00.000Z`);

function assertSafeDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Presentation seed is disabled when NODE_ENV=production.");
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
  if (!localHosts.has(host) && process.env.ALLOW_PRESENTATION_SEED !== "true") {
    throw new Error(
      "Remote database seed blocked. Set ALLOW_PRESENTATION_SEED=true only for an approved demo database.",
    );
  }
}

async function upsertUser(definition, passwordHash) {
  return prisma.user.upsert({
    where: { email: definition.email },
    update: {
      username: definition.username,
      password: passwordHash,
      role: definition.role,
      status: "ACTIVE",
      profile: {
        upsert: {
          create: definition.profile,
          update: definition.profile,
        },
      },
    },
    create: {
      username: definition.username,
      email: definition.email,
      password: passwordHash,
      role: definition.role,
      status: "ACTIVE",
      profile: { create: definition.profile },
    },
  });
}

async function cleanPresentationData(userIds) {
  const demoProperties = await prisma.property.findMany({
    where: {
      ownerId: { in: userIds },
      title: { in: DEMO_PROPERTY_TITLES },
    },
    select: { id: true },
  });

  const propertyIds = demoProperties.map(({ id }) => id);
  if (propertyIds.length) {
    await prisma.property.deleteMany({ where: { id: { in: propertyIds } } });
  }

  await prisma.ownerApplication.deleteMany({
    where: { userId: { in: userIds } },
  });
}

async function main() {
  assertSafeDatabase();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const amenityDefinitions = [
    ["WIFI", "Wi-Fi"],
    ["AIR_CONDITIONING", "Air conditioning"],
    ["PARKING", "Parking"],
    ["WASHING_MACHINE", "Washing machine"],
    ["REFRIGERATOR", "Refrigerator"],
    ["ELEVATOR", "Elevator"],
    ["BALCONY", "Balcony"],
    ["FITNESS", "Fitness center"],
    ["SWIMMING_POOL", "Swimming pool"],
  ];

  const houseRuleDefinitions = [
    ["PETS_ALLOWED", "Pets allowed"],
    ["NO_SMOKING", "No smoking"],
    ["GUESTS_ALLOWED", "Guests allowed"],
    ["NO_PARTIES", "No parties"],
    ["COOKING_ALLOWED", "Cooking allowed"],
    ["QUIET_HOURS", "Quiet hours"],
  ];

  await Promise.all([
    ...amenityDefinitions.map(([code, name]) =>
      prisma.amenity.upsert({
        where: { code },
        update: { name },
        create: { code, name },
      }),
    ),
    ...houseRuleDefinitions.map(([code, name]) =>
      prisma.houseRule.upsert({
        where: { code },
        update: { name },
        create: { code, name },
      }),
    ),
  ]);

  const amenities = Object.fromEntries(
    (await prisma.amenity.findMany()).map((item) => [item.code, item.id]),
  );
  const houseRules = Object.fromEntries(
    (await prisma.houseRule.findMany()).map((item) => [item.code, item.id]),
  );

  const userDefinitions = [
    {
      username: "roomhub_admin",
      email: "admin@demo.roomhub.local",
      role: "ADMIN",
      profile: {
        firstName: "May",
        lastName: "Sirin",
        occupation: "Platform Administrator",
        currentAddress: "Bangkok",
        gender: "FEMALE",
        birthdate: date("1992-02-14"),
        isVerified: true,
        profileImageUrl: STOCK.userFemale2,
        bio: "RoomHub operations team.",
      },
    },
    {
      username: "anan_sukhumvit",
      email: "owner.sukhumvit@demo.roomhub.local",
      role: "OWNER",
      profile: {
        firstName: "Anan",
        lastName: "Wattanakul",
        phone: "0812345678",
        occupation: "Property Manager",
        currentAddress: "Watthana, Bangkok",
        gender: "MALE",
        birthdate: date("1988-05-20"),
        isVerified: true,
        profileImageUrl: STOCK.ownerMale,
        bio: "Managing a small collection of homes around Sukhumvit and Ratchada.",
      },
    },
    {
      username: "malee_localhomes",
      email: "owner.local@demo.roomhub.local",
      role: "OWNER",
      profile: {
        firstName: "Malee",
        lastName: "Suksan",
        phone: "0898765432",
        occupation: "Local Host",
        currentAddress: "Phra Khanong, Bangkok",
        gender: "FEMALE",
        birthdate: date("1990-09-09"),
        isVerified: true,
        profileImageUrl: STOCK.ownerFemale,
        bio: "Local host focused on comfortable, practical homes for young professionals.",
      },
    },
    {
      username: "narin_dev",
      email: "narin@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Narin",
        lastName: "K.",
        occupation: "Frontend Developer",
        currentAddress: "Bangkok",
        gender: "MALE",
        birthdate: date("1998-03-12"),
        isVerified: true,
        profileImageUrl: STOCK.userMale,
        bio: "Hybrid developer looking for a quiet place near BTS and a friendly housemate.",
      },
    },
    {
      username: "pim_design",
      email: "pim@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Pim",
        lastName: "Chayada",
        occupation: "Product Designer",
        currentAddress: "Ari, Bangkok",
        gender: "FEMALE",
        birthdate: date("1998-07-10"),
        isVerified: true,
        profileImageUrl: STOCK.userFemale,
        bio: "Designer, coffee lover, and tidy roommate.",
      },
    },
    {
      username: "mint_marketing",
      email: "mint@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Mint",
        lastName: "Nattaya",
        occupation: "Digital Marketer",
        currentAddress: "Huai Khwang, Bangkok",
        gender: "FEMALE",
        birthdate: date("1998-11-15"),
        isVerified: true,
        profileImageUrl: STOCK.userFemale3,
        bio: "Easygoing, social on weekends, quiet on work nights.",
      },
    },
    {
      username: "beam_data",
      email: "beam@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Beam",
        lastName: "Thanawat",
        occupation: "Data Analyst",
        currentAddress: "Bangkok",
        gender: "MALE",
        birthdate: date("1998-05-10"),
        isVerified: true,
        profileImageUrl: STOCK.userMale2,
        bio: "Non-smoker, clean, usually working from office.",
      },
    },
    {
      username: "june_arch",
      email: "june@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "June",
        lastName: "Praewa",
        occupation: "Architect",
        currentAddress: "Bang Na, Bangkok",
        gender: "FEMALE",
        birthdate: date("1998-01-10"),
        isVerified: true,
        profileImageUrl: STOCK.userFemale2,
        bio: "Likes calm shared spaces, plants, and cooking.",
      },
    },
    {
      username: "ton_finance",
      email: "ton@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Ton",
        lastName: "Kittipong",
        occupation: "Financial Analyst",
        currentAddress: "Bangkok",
        gender: "MALE",
        birthdate: date("1998-06-10"),
        isVerified: true,
        profileImageUrl: STOCK.userMale,
        bio: "Office hours on weekdays, gym after work.",
      },
    },
    {
      username: "fah_content",
      email: "fah@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Fah",
        lastName: "Ploy",
        occupation: "Content Creator",
        currentAddress: "Sukhumvit, Bangkok",
        gender: "FEMALE",
        birthdate: date("1998-12-10"),
        isVerified: true,
        profileImageUrl: STOCK.userFemale,
        bio: "Friendly and respectful of shared-space quiet hours.",
      },
    },
    {
      username: "boss_student",
      email: "boss@demo.roomhub.local",
      role: "USER",
      profile: {
        firstName: "Boss",
        lastName: "P.",
        occupation: "Graduate Student",
        currentAddress: "Bangkok",
        gender: "MALE",
        birthdate: date("1999-08-08"),
        isVerified: false,
        profileImageUrl: STOCK.userMale2,
        bio: "Graduate student looking for a room with easy transit access.",
      },
    },
  ];

  const users = {};
  for (const definition of userDefinitions) {
    users[definition.email] = await upsertUser(definition, passwordHash);
  }

  await cleanPresentationData(DEMO_EMAILS.map((email) => users[email].id));

  const admin = users["admin@demo.roomhub.local"];
  const ownerA = users["owner.sukhumvit@demo.roomhub.local"];
  const ownerB = users["owner.local@demo.roomhub.local"];
  const narin = users["narin@demo.roomhub.local"];
  const pim = users["pim@demo.roomhub.local"];
  const mint = users["mint@demo.roomhub.local"];
  const beam = users["beam@demo.roomhub.local"];
  const june = users["june@demo.roomhub.local"];
  const ton = users["ton@demo.roomhub.local"];
  const fah = users["fah@demo.roomhub.local"];
  const boss = users["boss@demo.roomhub.local"];

  await prisma.ownerApplication.createMany({
    data: [
      {
        userId: ownerA.id,
        reviewedById: admin.id,
        status: "APPROVED",
        reviewedAt: date("2026-08-20"),
      },
      {
        userId: ownerB.id,
        reviewedById: admin.id,
        status: "APPROVED",
        reviewedAt: date("2026-08-22"),
      },
    ],
  });

  const amenityLinks = (codes) => ({
    create: codes.map((code) => ({ amenityId: amenities[code] })),
  });

  const ruleLinks = (items) => ({
    create: items.map(([code, value = null]) => ({
      houseRuleId: houseRules[code],
      value,
    })),
  });

  const sukhumvit = await prisma.property.create({
    data: {
      ownerId: ownerA.id,
      title: "Sukhumvit Grove Residence",
      description:
        "Bright one-bedroom condo in central Sukhumvit with a calm living area, full kitchen, workspace, and easy access to BTS Asok and MRT Sukhumvit. Ideal for professionals who want a walkable neighborhood without giving up a quiet home.",
      propertyType: "CONDO",
      rentType: "WHOLE_UNIT",
      monthlyRent: 19000,
      deposit: 38000,
      availableDate: date("2026-09-20"),
      totalBedrooms: 1,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Bangkok",
          district: "Watthana",
          subDistrict: "Khlong Toei Nuea",
          postcode: "10110",
          road: "Sukhumvit 21",
          building: "Sukhumvit Grove",
          latitude: 13.7395,
          longitude: 100.5630,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.livingCity, isCover: true },
          { imageUrl: STOCK.bedroomLuxury },
          { imageUrl: STOCK.livingWarm },
          { imageUrl: STOCK.condoExterior },
        ],
      },
      amenities: amenityLinks([
        "WIFI",
        "AIR_CONDITIONING",
        "REFRIGERATOR",
        "WASHING_MACHINE",
        "ELEVATOR",
        "FITNESS",
        "SWIMMING_POOL",
      ]),
      houseRules: ruleLinks([
        ["NO_SMOKING"],
        ["GUESTS_ALLOWED"],
        ["NO_PARTIES"],
        ["COOKING_ALLOWED"],
        ["QUIET_HOURS", "22:00-07:00"],
      ]),
    },
  });

  const phromPhong = await prisma.property.create({
    data: {
      ownerId: ownerA.id,
      title: "Phrom Phong Parkside",
      description:
        "Modern condo close to Phrom Phong with warm interiors, balcony space, and convenient access to restaurants, supermarkets, parks, and BTS. A polished option for a couple or solo renter.",
      propertyType: "CONDO",
      rentType: "WHOLE_UNIT",
      monthlyRent: 24500,
      deposit: 49000,
      availableDate: date("2026-10-01"),
      totalBedrooms: 1,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Bangkok",
          district: "Watthana",
          subDistrict: "Khlong Tan Nuea",
          postcode: "10110",
          road: "Sukhumvit 39",
          building: "Parkside 39",
          latitude: 13.7310,
          longitude: 100.5708,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.livingNeutral, isCover: true },
          { imageUrl: STOCK.bedroomElegant },
          { imageUrl: STOCK.livingBright },
          { imageUrl: STOCK.condoExterior3 },
        ],
      },
      amenities: amenityLinks([
        "WIFI",
        "AIR_CONDITIONING",
        "PARKING",
        "REFRIGERATOR",
        "ELEVATOR",
        "FITNESS",
        "SWIMMING_POOL",
        "BALCONY",
      ]),
      houseRules: ruleLinks([
        ["NO_SMOKING"],
        ["NO_PARTIES"],
        ["GUESTS_ALLOWED"],
        ["QUIET_HOURS", "22:30-07:00"],
      ]),
    },
  });

  const ari = await prisma.property.create({
    data: {
      ownerId: ownerB.id,
      title: "Ari Garden Loft",
      description:
        "Relaxed low-rise apartment in Ari with leafy surroundings and two furnished rooms. Shared kitchen and living area, fast Wi-Fi, and a short walk to BTS Ari.",
      propertyType: "APARTMENT",
      rentType: "INDIVIDUAL_ROOM",
      monthlyRent: 8900,
      deposit: 8900,
      availableDate: date("2026-09-15"),
      totalBedrooms: 2,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Bangkok",
          district: "Phaya Thai",
          subDistrict: "Samsen Nai",
          postcode: "10400",
          road: "Phahonyothin",
          building: "Ari Garden Loft",
          latitude: 13.7797,
          longitude: 100.5448,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.livingCozy, isCover: true },
          { imageUrl: STOCK.livingWarm },
          { imageUrl: STOCK.condoExterior2 },
        ],
      },
      amenities: amenityLinks([
        "WIFI",
        "AIR_CONDITIONING",
        "WASHING_MACHINE",
        "REFRIGERATOR",
        "BALCONY",
      ]),
      houseRules: ruleLinks([
        ["NO_SMOKING"],
        ["COOKING_ALLOWED"],
        ["GUESTS_ALLOWED"],
        ["QUIET_HOURS", "22:00-07:00"],
      ]),
      rooms: {
        create: [
          {
            roomName: "Garden Room",
            description:
              "Quiet furnished room with a queen bed, desk, wardrobe, and soft natural light.",
            monthlyRent: 8900,
            status: "AVAILABLE",
            capacity: 2,
            images: {
              create: [
                { imageUrl: STOCK.bedroomDesk, isCover: true },
                { imageUrl: STOCK.bedroomLight },
              ],
            },
          },
          {
            roomName: "Loft Room",
            description:
              "Warm modern room with a large bed, storage, and direct access to the shared balcony.",
            monthlyRent: 9900,
            status: "AVAILABLE",
            capacity: 2,
            images: {
              create: [
                { imageUrl: STOCK.bedroomElegant, isCover: true },
                { imageUrl: STOCK.bedroomGlass },
              ],
            },
          },
        ],
      },
    },
    include: { rooms: true },
  });

  const ratchada = await prisma.property.create({
    data: {
      ownerId: ownerA.id,
      title: "Ratchada City Rooms",
      description:
        "Convenient shared apartment close to MRT Huai Khwang. Three private bedrooms, practical shared spaces, and a friendly setup for people working around Ratchada and Rama 9.",
      propertyType: "APARTMENT",
      rentType: "INDIVIDUAL_ROOM",
      monthlyRent: 7200,
      deposit: 7200,
      availableDate: date("2026-09-18"),
      totalBedrooms: 3,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Bangkok",
          district: "Huai Khwang",
          subDistrict: "Huai Khwang",
          postcode: "10310",
          road: "Ratchadaphisek",
          building: "Ratchada City Rooms",
          latitude: 13.7788,
          longitude: 100.5738,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.livingNeutral, isCover: true },
          { imageUrl: STOCK.livingCozy },
          { imageUrl: STOCK.condoExterior2 },
        ],
      },
      amenities: amenityLinks([
        "WIFI",
        "AIR_CONDITIONING",
        "WASHING_MACHINE",
        "REFRIGERATOR",
        "ELEVATOR",
      ]),
      houseRules: ruleLinks([
        ["NO_SMOKING"],
        ["NO_PARTIES"],
        ["COOKING_ALLOWED"],
        ["QUIET_HOURS", "23:00-07:00"],
      ]),
      rooms: {
        create: [
          {
            roomName: "City Room 1",
            description: "Compact private room with desk and wardrobe.",
            monthlyRent: 7200,
            status: "AVAILABLE",
            capacity: 1,
            images: { create: [{ imageUrl: STOCK.bedroomModern, isCover: true }] },
          },
          {
            roomName: "City Room 2",
            description: "Bright private room with queen bed and window seating.",
            monthlyRent: 7900,
            status: "AVAILABLE",
            capacity: 1,
            images: { create: [{ imageUrl: STOCK.bedroomLight, isCover: true }] },
          },
          {
            roomName: "City Room 3",
            description: "Larger bedroom currently occupied by an existing resident.",
            monthlyRent: 8500,
            status: "RENTED",
            capacity: 1,
            images: { create: [{ imageUrl: STOCK.bedroomLuxury, isCover: true }] },
          },
        ],
      },
    },
    include: { rooms: true },
  });

  const onNut = await prisma.property.create({
    data: {
      ownerId: ownerB.id,
      title: "On Nut Urban Home",
      description:
        "Two-bedroom city home near BTS On Nut with a spacious living room, practical kitchen, parking, and a comfortable neighborhood feel.",
      propertyType: "HOUSE",
      rentType: "WHOLE_UNIT",
      monthlyRent: 17500,
      deposit: 35000,
      availableDate: date("2026-10-05"),
      totalBedrooms: 2,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Bangkok",
          district: "Phra Khanong",
          subDistrict: "Bang Chak",
          postcode: "10260",
          road: "Sukhumvit 77",
          building: "On Nut Urban Home",
          latitude: 13.7064,
          longitude: 100.6011,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.livingBright, isCover: true },
          { imageUrl: STOCK.bedroomDesk },
          { imageUrl: STOCK.livingCozy },
        ],
      },
      amenities: amenityLinks([
        "WIFI",
        "AIR_CONDITIONING",
        "PARKING",
        "WASHING_MACHINE",
        "REFRIGERATOR",
      ]),
      houseRules: ruleLinks([
        ["PETS_ALLOWED"],
        ["NO_SMOKING"],
        ["COOKING_ALLOWED"],
        ["NO_PARTIES"],
      ]),
    },
  });

  const bangNa = await prisma.property.create({
    data: {
      ownerId: ownerB.id,
      title: "Bang Na Shared House",
      description:
        "Friendly shared house close to BTS Bang Na with a big common area, kitchen, parking, and two rooms suited to students or early-career professionals.",
      propertyType: "HOUSE",
      rentType: "INDIVIDUAL_ROOM",
      monthlyRent: 6800,
      deposit: 6800,
      availableDate: date("2026-09-25"),
      totalBedrooms: 2,
      publishStatus: "APPROVED",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Bangkok",
          district: "Bang Na",
          subDistrict: "Bang Na",
          postcode: "10260",
          road: "Bang Na-Trat",
          building: "Bang Na Shared House",
          latitude: 13.6684,
          longitude: 100.6049,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.livingWarm, isCover: true },
          { imageUrl: STOCK.livingNeutral },
          { imageUrl: STOCK.bedroomModern },
        ],
      },
      amenities: amenityLinks([
        "WIFI",
        "AIR_CONDITIONING",
        "PARKING",
        "WASHING_MACHINE",
        "REFRIGERATOR",
      ]),
      houseRules: ruleLinks([
        ["NO_SMOKING"],
        ["GUESTS_ALLOWED"],
        ["COOKING_ALLOWED"],
        ["QUIET_HOURS", "22:00-06:30"],
      ]),
      rooms: {
        create: [
          {
            roomName: "Front Room",
            description: "Comfortable room with desk and morning light.",
            monthlyRent: 6800,
            status: "AVAILABLE",
            capacity: 1,
            images: { create: [{ imageUrl: STOCK.bedroomDesk, isCover: true }] },
          },
          {
            roomName: "Balcony Room",
            description: "Larger room with balcony access and extra storage.",
            monthlyRent: 7600,
            status: "AVAILABLE",
            capacity: 2,
            images: { create: [{ imageUrl: STOCK.bedroomGlass, isCover: true }] },
          },
        ],
      },
    },
    include: { rooms: true },
  });

  // Admin portal presentation states.
  await prisma.property.create({
    data: {
      ownerId: ownerB.id,
      title: "Riverstone Townhome",
      description:
        "Newly renovated townhome submission awaiting RoomHub review.",
      propertyType: "HOUSE",
      rentType: "WHOLE_UNIT",
      monthlyRent: 21000,
      deposit: 42000,
      totalBedrooms: 3,
      publishStatus: "PENDING",
      propertyStatus: "AVAILABLE",
      address: {
        create: {
          province: "Nonthaburi",
          district: "Pak Kret",
          subDistrict: "Bang Talat",
          postcode: "11120",
          latitude: 13.9048,
          longitude: 100.5272,
        },
      },
      images: {
        create: [
          { imageUrl: STOCK.condoExterior3, isCover: true },
          { imageUrl: STOCK.livingBright },
        ],
      },
    },
  });

  await prisma.property.create({
    data: {
      ownerId: ownerA.id,
      title: "Central Studio Listing",
      description: "Studio listing submitted with incomplete supporting details.",
      propertyType: "CONDO",
      rentType: "WHOLE_UNIT",
      monthlyRent: 15000,
      totalBedrooms: 1,
      publishStatus: "REJECTED",
      propertyStatus: "AVAILABLE",
      rejectReason:
        "Please provide clearer ownership evidence and additional room photos before resubmitting.",
      address: {
        create: {
          province: "Bangkok",
          district: "Pathum Wan",
          subDistrict: "Lumphini",
          postcode: "10330",
        },
      },
      images: {
        create: [{ imageUrl: STOCK.bedroomModern, isCover: true }],
      },
    },
  });

  const ariGardenRoom = ari.rooms.find(({ roomName }) => roomName === "Garden Room");
  const ariLoftRoom = ari.rooms.find(({ roomName }) => roomName === "Loft Room");
  const ratchadaRoom1 = ratchada.rooms.find(({ roomName }) => roomName === "City Room 1");
  const ratchadaRoom2 = ratchada.rooms.find(({ roomName }) => roomName === "City Room 2");
  const ratchadaRoom3 = ratchada.rooms.find(({ roomName }) => roomName === "City Room 3");
  const bangNaFrontRoom = bangNa.rooms.find(({ roomName }) => roomName === "Front Room");

  const ariCommunity = await prisma.communityPost.create({
    data: {
      propertyId: ari.id,
      roomId: ariLoftRoom.id,
      creatorId: pim.id,
      title: "Looking for a chill roommate in Ari",
      description:
        "I work in product design and usually keep weeknights quiet. Looking for someone tidy and easygoing to share this Ari place. Coffee runs welcome.",
      requiredMembers: 2,
      status: "OPEN",
    },
  });

  const ratchadaCommunity = await prisma.communityPost.create({
    data: {
      propertyId: ratchada.id,
      roomId: ratchadaRoom2.id,
      creatorId: mint.id,
      title: "Design + tech house near MRT Huai Khwang",
      description:
        "We already have two people working in design/data and are looking for one more roommate. Shared dinner sometimes, but everyone has their own schedule.",
      requiredMembers: 3,
      status: "OPEN",
    },
  });

  const bangNaCommunity = await prisma.communityPost.create({
    data: {
      propertyId: bangNa.id,
      roomId: bangNaFrontRoom.id,
      creatorId: june.id,
      title: "Quiet shared home near BTS Bang Na",
      description:
        "Looking for a considerate roommate who is okay with quiet hours and keeping common spaces clean. The house has a proper kitchen and parking.",
      requiredMembers: 2,
      status: "OPEN",
    },
  });

  await prisma.communityMember.createMany({
    data: [
      { communityPostId: ariCommunity.id, userId: pim.id, memberRole: "CREATOR" },
      { communityPostId: ratchadaCommunity.id, userId: mint.id, memberRole: "CREATOR" },
      { communityPostId: ratchadaCommunity.id, userId: beam.id, memberRole: "MEMBER" },
      { communityPostId: bangNaCommunity.id, userId: june.id, memberRole: "CREATOR" },
    ],
  });

  await prisma.joinRequest.createMany({
    data: [
      {
        communityPostId: ariCommunity.id,
        userId: narin.id,
        status: "PENDING",
        message: "Hi! I work hybrid and Ari is perfect for my commute. Happy to meet first.",
      },
      {
        communityPostId: ratchadaCommunity.id,
        userId: ton.id,
        status: "PENDING",
        message: "I work nearby at Rama 9 and your house setup sounds like a good fit.",
      },
      {
        communityPostId: bangNaCommunity.id,
        userId: boss.id,
        status: "PENDING",
        message: "I'm a graduate student and mostly study on campus during the day.",
      },
    ],
  });

  // Realistic inbox with both normal text and rich shared-listing cards.
  const sukhumvitConversation = await prisma.conversation.create({
    data: {
      propertyId: sukhumvit.id,
      members: {
        create: [{ userId: ownerA.id }, { userId: narin.id }],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: sukhumvitConversation.id,
        senderId: narin.id,
        message: "Hi Anan, is Sukhumvit Grove still available from late September?",
        type: "TEXT",
        isRead: true,
        createdAt: new Date("2026-09-10T11:05:00.000Z"),
      },
      {
        conversationId: sukhumvitConversation.id,
        senderId: ownerA.id,
        message: "Yes, it is. The unit is ready for viewing this weekend.",
        type: "TEXT",
        isRead: true,
        createdAt: new Date("2026-09-10T11:10:00.000Z"),
      },
      {
        conversationId: sukhumvitConversation.id,
        senderId: ownerA.id,
        message: "This is the listing we are discussing.",
        type: "PROPERTY_SHARE",
        sharedPropertyId: sukhumvit.id,
        isRead: true,
        createdAt: new Date("2026-09-10T11:11:00.000Z"),
      },
      {
        conversationId: sukhumvitConversation.id,
        senderId: narin.id,
        message: "Looks good. Could I view it Saturday around 11 AM?",
        type: "TEXT",
        isRead: false,
        createdAt: new Date("2026-09-10T11:15:00.000Z"),
      },
    ],
  });

  const ariConversation = await prisma.conversation.create({
    data: {
      propertyId: ari.id,
      members: {
        create: [{ userId: ownerB.id }, { userId: pim.id }],
      },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: ariConversation.id,
        senderId: pim.id,
        message: "Hi, I'm interested in the Garden Room. Is the desk included?",
        type: "TEXT",
        isRead: true,
        createdAt: new Date("2026-09-09T07:30:00.000Z"),
      },
      {
        conversationId: ariConversation.id,
        senderId: ownerB.id,
        message: "Yes, all furniture in the photos is included.",
        type: "TEXT",
        isRead: true,
        createdAt: new Date("2026-09-09T07:36:00.000Z"),
      },
      {
        conversationId: ariConversation.id,
        senderId: ownerB.id,
        message: "Here is the exact room.",
        type: "ROOM_SHARE",
        sharedRoomId: ariGardenRoom.id,
        isRead: true,
        createdAt: new Date("2026-09-09T07:37:00.000Z"),
      },
    ],
  });

  await prisma.rental.create({
    data: {
      propertyId: ratchada.id,
      roomId: ratchadaRoom3.id,
      ownerId: ownerA.id,
      startDate: date("2026-07-01"),
      monthlyRent: 8500,
      status: "ACTIVE",
      members: { create: { userId: fah.id } },
    },
  });

  await prisma.rentalRequest.createMany({
    data: [
      {
        propertyId: ari.id,
        roomId: ariGardenRoom.id,
        requesterId: narin.id,
        status: "PENDING",
        startDate: date("2026-10-01"),
      },
      {
        propertyId: ratchada.id,
        roomId: ratchadaRoom1.id,
        requesterId: ton.id,
        status: "PENDING",
        startDate: date("2026-10-01"),
      },
      {
        propertyId: onNut.id,
        requesterId: beam.id,
        status: "PENDING",
        startDate: date("2026-10-15"),
      },
    ],
  });

  const counts = await Promise.all([
    prisma.user.count({ where: { email: { in: DEMO_EMAILS } } }),
    prisma.property.count({ where: { title: { in: DEMO_PROPERTY_TITLES } } }),
    prisma.communityPost.count({
      where: { id: { in: [ariCommunity.id, ratchadaCommunity.id, bangNaCommunity.id] } },
    }),
    prisma.conversation.count({
      where: { id: { in: [sukhumvitConversation.id, ariConversation.id] } },
    }),
  ]);

  console.log(`
RoomHub presentation seed completed.

Demo login password:
${PASSWORD}

Recommended presentation accounts:
USER   narin@demo.roomhub.local
OWNER  owner.sukhumvit@demo.roomhub.local
OWNER2 owner.local@demo.roomhub.local
ADMIN  admin@demo.roomhub.local

Seeded:
Users: ${counts[0]}
Properties: ${counts[1]}
Communities: ${counts[2]}
Conversations: ${counts[3]}

Public listing highlights:
- Sukhumvit Grove Residence (near Asok)
- Phrom Phong Parkside (near Phrom Phong)
- Ari Garden Loft
- Ratchada City Rooms
- On Nut Urban Home
- Bang Na Shared House
`);
}

main()
  .catch((error) => {
    console.error("Presentation seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
