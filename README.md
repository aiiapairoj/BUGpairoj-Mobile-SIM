# BUGpairoj Mobile SIM

Chrome Extension (Manifest V3) สำหรับดูเว็บไซต์ปัจจุบันหลายขนาดหน้าจอพร้อมกันแบบ Overlay

**AI Pairoj — by BUGpairoj**

## ฟีเจอร์ที่พร้อมใช้

- Preview พร้อมกัน 1–5 อุปกรณ์
- Preset มือถือ/แท็บเล็ต 16 ขนาด + Custom resolution
- iOS / Android User-Agent สำหรับ document request ของ preview frame
- Rotate Portrait / Landscape รายอุปกรณ์
- Scale 40–110%
- Dark / Light Theme
- Focus Mode
- Sync Scroll / Click / Input ระหว่าง preview frames
- Screenshot preview เป็น PNG
- Record active tab เป็น WebM 1080p/30fps (ขึ้นกับเครื่อง/Chrome)
- Settings จำด้วย `chrome.storage.sync`
- ปลด `X-Frame-Options` เฉพาะ subframe ในแท็บที่เปิดเครื่องมือ
- Compatibility Mode สำหรับเว็บที่ CSP บล็อก iframe (ผู้ใช้เปิดเอง)
- Keyboard shortcuts: `Alt+Shift+M` เปิด/ปิด, `Alt+Shift+S` screenshot
- ไม่มี Login, Analytics หรือ Remote Code

## ติดตั้งแบบ Unpacked

1. แตก ZIP นี้ไว้ในโฟลเดอร์ถาวร
2. เปิด Chrome แล้วเข้า `chrome://extensions`
3. เปิด **Developer mode**
4. กด **Load unpacked**
5. เลือกโฟลเดอร์ `BUGpairoj-Mobile-SIM`
6. Pin Extension ไว้บน Toolbar
7. เปิดหน้าเว็บ `http://` หรือ `https://` แล้วคลิกไอคอน Extension

> Chrome ไม่อนุญาตให้ Extension ฉีด UI ลงหน้า `chrome://`, Chrome Web Store และหน้าระบบบางประเภท

## วิธีใช้

- คลิกไอคอน Extension เพื่อเปิด/ปิด Overlay
- เลือกอุปกรณ์ใน Settings ได้สูงสุด 5 ตัว
- ปุ่มหมุนอยู่เหนืออุปกรณ์แต่ละตัว
- ใช้ Scale เพื่อย่อ/ขยายภาพรวมโดยไม่เปลี่ยน viewport ภายใน
- Screenshot จะจับพื้นที่ preview ที่มองเห็นอยู่
- Record จะบันทึก **แท็บปัจจุบัน** เป็น WebM และดาวน์โหลดอัตโนมัติ

## Compatibility Mode

ค่าเริ่มต้น Extension จะลบเฉพาะ `X-Frame-Options` ของ `sub_frame` ในแท็บที่เปิดเครื่องมือเท่านั้น

ถ้า preview ว่างเพราะเว็บไซต์ใช้ CSP `frame-ancestors` แบบเข้ม ให้เปิด **Compatibility Mode** ใน Settings ระบบจะลบ `Content-Security-Policy` เฉพาะ response ของ `sub_frame` ในแท็บนั้นและสร้าง iframe ใหม่

ควรเปิดเฉพาะตอนทดสอบเว็บที่คุณไว้ใจ เพราะการผ่อน CSP มีผลด้านความปลอดภัยภายใน preview frame

## ข้อจำกัดที่ควรรู้

- เว็บที่ใช้ COEP/CORP, frame-busting script, anti-bot หรือ authentication/cookie policy เข้ม อาจแสดงไม่สมบูรณ์
- การจำลองนี้เน้น Responsive viewport + UA ของ frame ไม่ใช่ hardware emulation เต็มรูปแบบแบบ Chrome DevTools
- Sync click ใช้ CSS selector จึงอาจไม่ตรง 100% หาก DOM ต่างกันตาม breakpoint
- Recording ปัจจุบันบันทึกทั้ง visible tab รวม Overlay; ไม่ใช่ crop เฉพาะ device
- MP4 ไม่ถูกแปลงในรุ่นนี้เพื่อคง Extension แบบ offline และลด dependency; ใช้ WebM ซึ่ง Chrome รองรับโดยตรง

## Permissions

| Permission | ใช้ทำอะไร |
|---|---|
| `activeTab` | ทำงานหลังผู้ใช้คลิก Extension |
| `scripting` | Inject overlay เฉพาะ top frame |
| `storage` | จำ theme/device/scale/settings |
| `tabs` | อ่าน tab/window ที่กำลังใช้งานและ screenshot |
| `declarativeNetRequestWithHostAccess` | แก้ XFO/CSP/UA เฉพาะ preview requests |
| `tabCapture` | บันทึกวิดีโอแท็บ |
| `offscreen` | รัน MediaRecorder ใน MV3 |
| `downloads` | ดาวน์โหลดไฟล์ WebM |
| `<all_urls>` | รองรับเว็บไซต์ที่ผู้ใช้เลือกเปิดเครื่องมือ |

## Development / QA

ไฟล์ทั้งหมดเป็น Vanilla JavaScript/CSS ไม่มี build step และไม่มี remote dependency

ตรวจ syntax:

```bash
node --check background.js
node --check content.js
node --check frame-agent.js
node --check offscreen.js
```

