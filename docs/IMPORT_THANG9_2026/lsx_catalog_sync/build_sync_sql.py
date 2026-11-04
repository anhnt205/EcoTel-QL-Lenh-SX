"""Sinh SQL đồng bộ danh mục Lệnh SX (Mongo, chỉ đọc) -> Thống kê (Postgres) trên gdata.
Quy tắc (dự án chốt): bản ghi hai bên đều có thì GIỮ dữ liệu Thống kê, chỉ gắn mongo_id; bản ghi chỉ có ở Lệnh SX thì THÊM.
Không xoá, không đè (ngoại lệ đã được chủ dự án duyệt: giờ ca lấy theo Lệnh SX). Không chép mật khẩu từ Lệnh SX.
Chạy:  python -I build_sync_sql.py  (đọc /sy/*.json, ghi /sy/out/apply.sql + /sy/out/plan.json)"""
import json, re, secrets, string, unicodedata, collections, os, datetime

SY = '/sy'
L = json.load(open(f'{SY}/lenhsx_catalogs.json', encoding='utf-8'))
LU = json.load(open(f'{SY}/lenhsx_users.json', encoding='utf-8'))
T = json.load(open(f'{SY}/tk_catalogs.json', encoding='utf-8'))
TU = json.load(open(f'{SY}/tk_users.json', encoding='utf-8'))
os.makedirs(f'{SY}/out', exist_ok=True)


def norm(s):
    s = unicodedata.normalize('NFC', str(s or '')).strip().lower().replace('đ', 'd')
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '', s)


def q(v):
    if v is None or v == '':
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def num(v):
    try:
        return repr(float(v)) if v not in (None, '') else 'NULL'
    except (TypeError, ValueError):
        return 'NULL'


sql = ['\\set ON_ERROR_STOP on', 'BEGIN;']
plan = {}
notes = collections.defaultdict(list)

# ---- 1. Đơn vị ------------------------------------------------------------------------------------------------
tk_dep = T['departments']
used = set(); link = []; new = []
by_code = {norm(t['code']): t for t in tk_dep if t['code']}
by_name = {norm(t['name']): t for t in tk_dep}
tk_codes_exact = {str(t['code']).lower() for t in tk_dep}; tk_names_exact = {str(t['name']).strip().lower() for t in tk_dep}
for d in L['departments']:
    t = by_code.get(norm(d['code'])) or by_name.get(norm(d['name']))
    if t and t['id'] not in used:
        used.add(t['id']); link.append((t, d))
    elif t:
        notes['departments'].append(f"bỏ qua {d['code']}: TK {t['code']} đã gắn với đơn vị khác")
    else:
        if str(d['code']).lower() in tk_codes_exact or str(d['name']).strip().lower() in tk_names_exact:
            notes['departments'].append(f"bỏ qua {d['code']}: đụng mã/tên duy nhất của đơn vị TK khác")
        else:
            new.append(d)
for t, d in link:
    if not t.get('mongo_id'):
        sql.append(f"UPDATE departments SET mongo_id={q(d['id'])} WHERE id={t['id']} AND mongo_id IS NULL;")
for d in new:
    sql.append("INSERT INTO departments (id, code, name, description, mongo_id, full_data_scope, created_at, updated_at) VALUES "
               f"(nextval('department_seq'), {q(d['code'])}, {q(d['name'].strip())}, {q(d.get('description'))}, {q(d['id'])}, false, now(), now());")
plan['departments'] = {'link': len(link), 'insert': len(new)}

# ---- 2. Loại thiết bị -----------------------------------------------------------------------------------------
tk_dt = T['device_types']; used = set(); link = []; new = []
dt_by_name = {norm(t['name']): t for t in tk_dt}
tk_dt_names_exact = {str(t['name']).strip().lower() for t in tk_dt}
for d in L['devicetypes']:
    t = dt_by_name.get(norm(d['name']))
    if t and t['id'] not in used:
        used.add(t['id']); link.append((t, d))
    elif t:
        notes['device_types'].append(f"bỏ qua {d['name']}: đã gắn với loại khác")
    else:
        new.append(d)
group_map = {'xe': 'XE', 'may': 'MAY'}
for t, d in link:
    if not t.get('mongo_id'):
        sql.append(f"UPDATE device_types SET mongo_id={q(d['id'])} WHERE id={t['id']} AND mongo_id IS NULL;")
for d in new:
    g = group_map.get(norm(d.get('group')))
    sql.append("INSERT INTO device_types (id, name, group_type, mongo_id, created_at, updated_at) VALUES "
               f"(nextval('device_type_seq'), {q(d['name'].strip())}, {q(g)}, {q(d['id'])}, now(), now());")
plan['device_types'] = {'link': len(link), 'insert': len(new)}

# ---- 3. Ca (gắn liên kết + giờ theo Lệnh SX, chủ dự án duyệt) ---------------------------------------------------
tk_sh = {s['name']: s for s in T['shifts']}; n_sh = 0
for s in L['shifts']:
    t = tk_sh.get(s['name'])
    if t:
        sql.append(f"UPDATE shifts SET mongo_id=COALESCE(mongo_id,{q(s['id'])}), start_time={q(s['startTime'])}, end_time={q(s['endTime'])}, updated_at=now() WHERE id={t['id']};")
        n_sh += 1
    else:
        notes['shifts'].append(f"ca {s['name']} chưa có ở TK, không thêm")
plan['shifts'] = {'link_and_update_times': n_sh}

# ---- 4. Thiết bị ---------------------------------------------------------------------------------------------------
tk_dev = T['devices']
tk_by_code = collections.defaultdict(list); tk_by_name = collections.defaultdict(list)
for t in tk_dev:
    tk_by_code[norm(t['code'])].append(t); tk_by_name[norm(t['name'])].append(t)
cand = {}   # lsx id -> tk row
tk_claims = collections.defaultdict(list)
for d in L['devices']:
    t = None
    for key, idx in ((norm(d['code']), tk_by_code), (norm(d.get('vehicleNumber')), tk_by_code), (norm(d['code']), tk_by_name)):
        if key and len(idx.get(key, [])) == 1:
            t = idx[key][0]; break
    if t:
        cand[d['id']] = t; tk_claims[t['id']].append(d['id'])
ambiguous_tk = {tid for tid, ids in tk_claims.items() if len(ids) > 1}
link = []; new = []; skipped = []
for d in L['devices']:
    t = cand.get(d['id'])
    if t and t['id'] in ambiguous_tk:
        skipped.append(d)
    elif t:
        link.append((t, d))
    else:
        new.append(d)
for t, d in link:
    if not t.get('mongo_id'):
        sql.append(f"UPDATE devices SET mongo_id={q(d['id'])} WHERE id={t['id']} AND mongo_id IS NULL;")
status_map = {'available': 'AVAILABLE', 'in_use': 'IN_USE', 'maintenance': 'MAINTENANCE', 'broken': 'BROKEN', 'retired': 'RETIRED'}
dept_by_lsx_id = {d['id']: d for d in L['departments']}
for d in new:
    st = status_map.get(str(d.get('status') or '').lower(), 'AVAILABLE')
    dep_sub = f"(SELECT id FROM departments WHERE mongo_id={q(next((x['id'] for x in L['departments'] if x['name'] == d.get('department') and x['code'] == d.get('departmentCode')), None))})" if d.get('department') else 'NULL'
    cat_id = next((x['id'] for x in L['devicetypes'] if x['name'] == d.get('category')), None)
    cat_sub = f"(SELECT id FROM device_types WHERE mongo_id={q(cat_id)})" if cat_id else 'NULL'
    sql.append("INSERT INTO devices (id, code, name, vehicle_number, fuel_type, capacity, status, department_id, category_id, mongo_id, created_at, updated_at) VALUES "
               f"(nextval('device_seq'), {q(d['code'])}, {q(d.get('name'))}, {q((d.get('vehicleNumber') or '').strip())}, {q(d.get('fuelType'))}, {num(d.get('capacity'))}, '{st}', {dep_sub}, {cat_sub}, {q(d['id'])}, now(), now());")
plan['devices'] = {'link': len(link), 'insert': len(new), 'skipped_ambiguous': len(skipped)}
if skipped:
    notes['devices'].append(f"{len(skipped)} thiết bị LSX trùng khoá với cùng một thiết bị TK — bỏ qua: " + ', '.join(s['code'] for s in skipped[:10]))

# ---- 5. Cán bộ nhân viên ---------------------------------------------------------------------------------------------
def stamp(u):
    return u.get('updatedAt') or u.get('createdAt') or ''
by_sc = collections.defaultdict(list)
for u in LU:
    by_sc[str(u['salaryCode']).strip()].append(u)
keep = []; dropped = 0
for sc, lst in by_sc.items():
    lst.sort(key=lambda u: (stamp(u), u['id']), reverse=True)
    keep.append(lst[0]); dropped += len(lst) - 1
    if len(lst) > 1:
        notes['users'].append(f"số thẻ {sc} trùng {len(lst)} bản ghi ở Lệnh SX — lấy bản mới nhất")
tk_by_sc = {str(t['salary_code']).strip(): t for t in TU}
tk_usernames = {str(t['username']).lower() for t in TU}
link = []; new = []; name_mismatch = []; seen_user = set(); uname_skip = 0
for u in keep:
    sc = str(u['salaryCode']).strip()
    t = tk_by_sc.get(sc)
    if t:
        link.append((t, u))
        if norm(t['full_name']) != norm(u['fullName']):
            name_mismatch.append((sc, t['full_name'], u['fullName']))
    else:
        un = str(u['username']).strip()
        if un.lower() in tk_usernames or un.lower() in seen_user:
            uname_skip += 1; notes['users'].append(f"bỏ qua số thẻ {sc}: username đụng bản ghi khác"); continue
        seen_user.add(un.lower()); new.append(u)
for t, u in link:
    if not t.get('mongo_id'):
        sql.append(f"UPDATE users SET mongo_id={q(u['id'])} WHERE id={t['id']} AND mongo_id IS NULL;")
alpha = './' + string.ascii_letters + string.digits
role_map = {'admin': 'ADMIN', 'manager': 'MANAGER'}
phone_ok = re.compile(r'^[0-9+\-\s]{0,15}$')
for u in new:
    pwd = '$2a$10$' + ''.join(secrets.choice(alpha) for _ in range(53))   # đúng định dạng bcrypt, không ai biết bản gốc -> không đăng nhập được
    role = role_map.get(str(u.get('role') or '').lower(), 'EMPLOYEE')
    phone = u.get('phone') if u.get('phone') and phone_ok.match(str(u['phone'])) else None
    dep_sub = f"(SELECT id FROM departments WHERE mongo_id={q(u['department'])})" if u.get('department') else 'NULL'
    ca = (u.get('createdAt') or '')[:19].replace('T', ' ') or None
    ua = (u.get('updatedAt') or '')[:19].replace('T', ' ') or None
    sql.append("INSERT INTO users (id, username, password, full_name, gender, email, phone, salary_code, role, active, mongo_id, department_id, created_at, updated_at) VALUES "
               f"(nextval('user_seq'), {q(u['username'].strip())}, '{pwd}', {q(u['fullName'].strip())}, {q(u.get('gender'))}, {q(u.get('email'))}, {q(phone)}, {q(str(u['salaryCode']).strip())}, "
               f"'{role}', {'true' if u.get('active', True) else 'false'}, {q(u['id'])}, {dep_sub}, COALESCE({q(ca)}::timestamp, now()), COALESCE({q(ua)}::timestamp, now()));")
plan['users'] = {'lsx_total': len(LU), 'lsx_dup_dropped': dropped, 'link': len(link), 'insert': len(new), 'name_mismatch_linked': len(name_mismatch), 'username_conflict_skipped': uname_skip}
with open(f'{SY}/out/name_mismatch.csv', 'w', encoding='utf-8') as f:
    f.write('salary_code,ten_thong_ke,ten_lenh_sx\n')
    for sc, a, b in name_mismatch:
        f.write(f'{sc},"{a}","{b}"\n')

sql.append('COMMIT;')
open(f'{SY}/out/apply.sql', 'w', encoding='utf-8').write('\n'.join(sql) + '\n')
json.dump({'plan': plan, 'notes': {k: v[:15] for k, v in notes.items()}, 'sql_statements': len(sql)}, open(f'{SY}/out/plan.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({'plan': plan, 'sql_statements': len(sql)}, ensure_ascii=False, indent=1))
for k, v in notes.items():
    print(f'-- ghi chú {k}: {len(v)} mục; ví dụ:', v[:3])
