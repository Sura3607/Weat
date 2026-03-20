# Weat Docs Master Guide (Coordinator)

Muc tieu cua file nay: dong vai tro tai lieu dieu phoi trung tam cho toan bo du an MVP.

## 1) Cach dung tai lieu nay
- B1: Doc pham vi va muc tieu trong `plan.md`.
- B2: Chot API contract theo `endpoints.md` truoc khi code.
- B3: Frontend phai bám `frontend-standards.md`.
- B4: Trien khai theo thu tu trong `checklist-zero-to-done.md`.
- B5: Khi co thay doi, cap nhat docs lien quan trong cung pull request.

## 2) Ban do tai lieu (source of truth)
- Product + scope: `plan.md`
- API contract + realtime contract: `endpoints.md`
- Frontend standards: `frontend-standards.md`
- Delivery flow Zero -> Done: `checklist-zero-to-done.md`

Quy tac uu tien khi xung dot:
1. `endpoints.md` uu tien cho API contract.
2. `frontend-standards.md` uu tien cho quy uoc frontend.
3. `plan.md` uu tien cho scope va huong demo.

## 3) Rule code (ap dung cho ca backend va frontend)
- Naming:
  - Variables/functions: camelCase
  - Components/classes/types: PascalCase
  - Constants global: UPPER_SNAKE_CASE
- Function design:
  - Ham ngan, ro mot muc dich, uu tien pure function cho logic.
  - Tach validation, business logic, data access thanh cac layer rieng.
- API/service boundary:
  - Khong map DTO trong UI component.
  - Mapping va normalize data dat tai service layer.
- Error handling:
  - Khong nuot loi im lang.
  - Loi phai co message ro rang, co ma loi/domain code neu can.
- Logging:
  - Bat buoc co requestId cho backend request log.
  - Khong log token, secret, thong tin nhay cam.
- Testing:
  - Logic quan trong phai co test (unit/integration tuy muc).
  - Bug da fix phai co testcase de tranh tai phat.
- Readability:
  - Moi file nen co mot trach nhiem ro.
  - Uu tien code de doc truoc khi toi uu som.

## 4) Rule commit
Format commit message:
- `<type>(<scope>): <short summary>`

Types duoc dung:
- `feat`: them tinh nang
- `fix`: sua loi
- `refactor`: cai to code khong doi hanh vi
- `docs`: cap nhat tai lieu
- `test`: them/sua test
- `chore`: viec ha tang, script, config

Vi du:
- `feat(radar): sort friends before strangers`
- `fix(invite): prevent duplicate pending invite`
- `docs(guide): add coordinator and coding rules`

Quy tac commit:
- Mot commit = mot y nghia thay doi ro rang.
- Khong tron nhieu noi dung khong lien quan trong cung mot commit.
- Commit phai build/lint/test pass o muc toi thieu cua phan bi anh huong.
- Neu thay doi API contract, bat buoc commit cap nhat `endpoints.md`.
- Neu thay doi luong UI quan trong, bat buoc commit cap nhat `frontend-standards.md` hoac checklist lien quan.

## 5) Rule pull request
- Tieu de PR ro pham vi, co prefix type tuong tu commit.
- Mo ta PR bat buoc co:
  - Muc tieu thay doi
  - File/tai lieu da cap nhat
  - Cach test
  - Rui ro va rollback (neu co)
- Checklist PR toi thieu:
  - Da doi chieu voi `checklist-zero-to-done.md`
  - Da cap nhat docs lien quan
  - Khong con TODO nguy hiem truoc khi merge

## 6) Nghi thuc cap nhat docs
Bat cu thay doi nao lien quan den pham vi du an deu cap nhat 1 trong cac file sau:
- Scope/flow demo doi -> `plan.md`
- API/realtime doi -> `endpoints.md`
- UI architecture/standards doi -> `frontend-standards.md`
- Thu tu trien khai/Definition of Done doi -> `checklist-zero-to-done.md`

Khuyen nghi: moi PR co it nhat 1 dong trong phan mo ta PR ve docs da doi chieu.
