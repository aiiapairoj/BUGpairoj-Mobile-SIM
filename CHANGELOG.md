# Changelog

## 1.5.0 — Fast Deep
- ลด frame readiness timeout จาก 5.0 วินาทีเหลือ 1.2 วินาที
- Domain ที่จำว่าเป็น Deep จะเปิด Deep ก่อน inject UI/iframe จึงไม่เสียเวลาทดลอง Compatibility ซ้ำ
- Domain ใหม่ใช้ Compatibility ก่อน และ escalate เป็น Deep อัตโนมัติเมื่อไม่ Ready ภายใน 1.2 วินาที
- อัปเดต migration/settings schema เป็น v5


## 1.4.0

- เพิ่ม Smart Auto Detection
- Auto escalation: Basic/Standard → Compatibility → Deep
- เพิ่ม per-domain engine memory ด้วย `chrome.storage.local`
- Domain ที่เคยต้องใช้ Deep สามารถเข้า Deep อัตโนมัติในการเปิดครั้งถัดไป
- Deep mode ไม่ถูก persist เป็น global setting ป้องกันเว็บอื่นเปิด debugger โดยไม่จำเป็น
- เพิ่มสถานะ `AUTO/MANUAL · STANDARD/COMPAT/DEEP` บน Toolbar
- Diagnostics แสดง Site profile ที่จำไว้
- Smart Auto จำกัด site profiles ล่าสุดสูงสุด 80 Domains
- ปิด Extension แล้ว detach debugger และลบ DNR session rules ตามเดิม
- ปรับ frame timeout เป็น 5 วินาทีเพื่อให้ Auto recovery เร็วขึ้น

## 1.3.0

- Deep Compatibility ผ่าน chrome.debugger/CDP
- Bypass Service Worker + disable cache
- DNR scope ด้วย active tabId
- Clean retry และ Diagnostics เพิ่มเติม
