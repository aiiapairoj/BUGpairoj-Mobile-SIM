# BUGpairoj Mobile SIM v1.5.0 — Fast Deep

Chrome Extension สำหรับ Preview เว็บไซต์หลายขนาดหน้าจอพร้อมกัน โดย v1.5 ปรับให้เข้าโหมดที่ใช้งานได้เร็วขึ้นและลดเวลารอ iframe

## จุดใหม่ v1.5

- **Fast Deep Timeout = 1.2 วินาที** (เดิม v1.4 รอ 5 วินาที)
- Domain ที่เคยใช้งานได้เฉพาะ **Deep Compatibility** จะเปิด Deep **ทันทีตั้งแต่เริ่ม Preview** ไม่รอ probe
- Domain ใหม่เริ่มที่ Compatibility; ถ้า frame-agent ไม่รายงาน READY ภายใน 1.2 วินาที จะยกระดับเป็น Deep อัตโนมัติ
- จำ Engine ต่อ Domain: `standard`, `compatibility`, `deep`
- เมื่อปิด Extension จะ detach `chrome.debugger`, คืน cache/Service Worker behavior และลบ DNR session rules

## Fast Path

```text
Known Deep Domain
  -> Apply DNR
  -> Attach debugger/CDP
  -> Bypass Service Worker + cache
  -> Render preview immediately

Unknown Domain
  -> Compatibility preview
  -> wait max 1.2 sec
  -> if not READY => Deep
  -> reload preview
  -> remember Deep when READY
```

## ทำไมไม่ตัด iframe ออกทั้งหมด

Multi-device preview แบบ 2–5 เครื่องอยู่ในหน้าเดียวต้องมี browsing context สำหรับแต่ละ viewport. Chrome Extension ปกติไม่มี `<webview>` แบบ Chrome App สำหรับแทน arbitrary website preview ดังนั้น iframe ยังเป็น renderer หลัก ส่วน Deep Compatibility ใช้ CDP เพื่อแก้เส้นทาง network/Service Worker/cache ให้ iframe โหลดได้เร็วและกว้างขึ้น

หากต้องการไม่ใช้ iframe จริง ๆ ต้องเปลี่ยน UX เป็นการเปิดหลาย Chrome windows/tabs ตามขนาด Device ซึ่งจะไม่ใช่ side-by-side overlay แบบเดิม

## วิธีติดตั้ง

1. แตกไฟล์ `BUGpairoj-Mobile-SIM-v1.5.0.zip`
2. เปิด `chrome://extensions`
3. เปิด Developer mode
4. Remove รุ่นเก่าหรือกด Reload หลังเลือกโฟลเดอร์รุ่นใหม่
5. กด Load unpacked แล้วเลือกโฟลเดอร์ `BUGpairoj-Mobile-SIM`
6. Refresh หน้าเว็บ แล้วคลิกไอคอน Extension

## โหมด Engine

- `STANDARD` — ไม่แก้ security headers
- `COMPAT` — ใช้ DNR เพื่อจัดการ X-Frame-Options/CSP สำหรับ preview
- `DEEP` — เพิ่ม `chrome.debugger` + CDP เพื่อ bypass Service Worker/cache ชั่วคราว

## หมายเหตุด้านความปลอดภัย

Compatibility/Deep มีไว้สำหรับ Development/Testing เท่านั้น เพราะอาจลดข้อจำกัดการ embed ของเว็บไซต์ในแท็บที่เปิด Simulator อยู่. กฎทั้งหมดเป็น session-scoped และถูกลบเมื่อปิด Extension. ไม่มี analytics, login หรือ remote code.

**AI Pairoj — by BUGpairoj**
