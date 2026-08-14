import secrets, string

def gen_code(prefix):
    alphabet = string.ascii_uppercase + string.digits
    return prefix + '-' + ''.join(secrets.choice(alphabet) for _ in range(6))

month_codes = set()
perm_codes = set()
while len(month_codes) < 50:
    month_codes.add(gen_code('MONTH'))
while len(perm_codes) < 50:
    perm_codes.add(gen_code('PERM'))

month_codes = sorted(month_codes)
perm_codes = sorted(perm_codes)

# write codes_list.txt
with open('codes_list.txt','w',encoding='utf-8') as f:
    f.write('type,code\n')
    for c in month_codes:
        f.write('month,'+c+'\n')
    for c in perm_codes:
        f.write('perm,'+c+'\n')

# prepare JS snippet
js_snippet = '/* AUTO-GENERATED ACTIVATION CODES START */\nvar ACTIVATION_CODES = [\n'
for c in month_codes:
    js_snippet += "  { code: '%s', type: 'month' },\n" % c
for c in perm_codes:
    js_snippet += "  { code: '%s', type: 'perm' },\n" % c
js_snippet += '];\n/* AUTO-GENERATED ACTIVATION CODES END */\n'

with open('codes_snippet.js','w',encoding='utf-8') as f:
    f.write(js_snippet)

print('WROTE codes_list.txt and codes_snippet.js')
print(js_snippet)
