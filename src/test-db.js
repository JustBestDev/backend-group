// ทดสอบการ connect โดยเพิ่ม
import { prisma } from "./lib/prisma.js";

prisma.$queryRaw`show tables`.then(console.log);

prisma.user.count().then(console.log);
