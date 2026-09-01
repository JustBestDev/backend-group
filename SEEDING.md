````md
# Team Test Seed

Seed นี้ใช้สำหรับฐานข้อมูล Local และฐานข้อมูลสำหรับพัฒนาของทีมที่ได้รับอนุญาตเท่านั้น

Seed จะสร้างข้อมูลทดสอบขนาดเล็กที่มีรูปแบบแน่นอน เพื่อครอบคลุมการทดสอบระบบ Authentication, การตรวจสอบของ Admin, Properties, Rooms, Communities, Conversations และ Rentals

## วิธีใช้งาน

ตั้งค่า environment variables สำหรับฐานข้อมูลตามปกติ จากนั้นรัน:

```bash
npm run seed
````

สามารถรันคำสั่งซ้ำได้

ระบบจะ:

* ใช้ email สำหรับ `upsert` ข้อมูล User
* ระบุข้อมูลที่ Seed เป็นเจ้าของจาก email ของ test account ที่กำหนดไว้ และชื่อ Property ที่ขึ้นต้นด้วย `Team Test ...`
* ลบเฉพาะข้อมูลในขอบเขตของ Seed ตาม dependency ที่เกี่ยวข้อง แล้วสร้างใหม่
* ไม่ใช้การล้างข้อมูลทั้ง table

ฐานข้อมูล Remote จะถูกป้องกันไม่ให้รัน Seed โดยค่าเริ่มต้น

หากต้องการรันกับฐานข้อมูลสำหรับพัฒนาของทีมที่ได้รับอนุญาตและไม่ใช่ Production ต้องกำหนด:

```env
ALLOW_TEAM_TEST_SEED=true
```

Seed จะปฏิเสธการทำงานเสมอหาก:

* `NODE_ENV=production`
* Database URL มีคำว่า `prod` หรือ `production` เป็นคำแยกอย่างชัดเจน

## บัญชีสำหรับทดสอบ

ทุกบัญชีใช้รหัสผ่านสำหรับ Development เท่านั้น:

```text
Password123!
```

รหัสผ่านจะถูกเก็บในฐานข้อมูลในรูปแบบ bcrypt hash

| กรณีทดสอบ                           | Email                       |
| ----------------------------------- | --------------------------- |
| Admin                               | `admin@test.local`          |
| Owner หลัก                          | `owner@test.local`          |
| Owner สำหรับทดสอบ Authorization     | `owner2@test.local`         |
| User หลัก                           | `user@test.local`           |
| User รอง                            | `user2@test.local`          |
| User ที่ถูก Suspended               | `suspended@test.local`      |
| User ที่ถูก Banned                  | `banned@test.local`         |
| ผู้สมัคร Owner ที่อยู่สถานะ Pending | `owner.pending@test.local`  |
| ผู้สมัคร Owner ที่ถูก Reject        | `owner.rejected@test.local` |

Property หลักสำหรับทดสอบหน้า Public คือ:

```text
Team Test Condo
```

โดยมี Room:

```text
Room A
Room B
Room C
```

## สถานะที่ Seed ครอบคลุม

* Owner Applications

  * Pending
  * Approved
  * Rejected

* Properties

  * Pending
  * Approved / Available
  * Rejected
  * Closed
  * Property Type และ Rent Type หลายแบบ
  * กรณีไม่มี Address
  * กรณีไม่มี Image
  * Property ของ Owner คนที่สองสำหรับทดสอบ Ownership / Authorization

* Rooms

  * Available
  * Reserved
  * Rented
  * มีหลายรูป
  * ไม่มีรูป
  * Monthly Rent แตกต่างกัน
  * Capacity แตกต่างกัน

* Communities

  * Open
  * Full
  * Closed
  * Creator และ Member roles
  * Join Request แบบ Pending
  * Accepted
  * Rejected

* Conversations

  * มี Owner และ User เป็นสมาชิก
  * มีข้อความจากทั้งสองฝั่ง
  * มีทั้งข้อความที่อ่านแล้วและยังไม่ได้อ่าน

* Rentals

  * Pending
  * Active
  * Completed
  * Cancelled
  * Room status จะถูกกำหนดให้สอดคล้องกับข้อมูล Rental

## ข้อควรระวัง

ห้ามใช้ข้อมูลบัญชีเหล่านี้หรือ Seed นี้กับระบบ Production

หลีกเลี่ยงการเปลี่ยนชื่อ Email ที่กำหนดไว้ หรือชื่อข้อมูล Seed เช่น:

```text
Team Test ...
```

โดยไม่แก้ไข `prisma/seed.js` ให้สอดคล้องกัน เพราะข้อมูลเหล่านี้ถูกใช้เพื่อระบุขอบเขตข้อมูลของ Seed สำหรับการรันซ้ำอย่างปลอดภัย

```

เวอร์ชันนี้เหมาะกับ README ของทีมมากกว่า เพราะอ่านไทยง่าย แต่ยังคง keyword ทางเทคนิคที่สมาชิกต้องเจอในโค้ดจริงไว้ครับ
```
