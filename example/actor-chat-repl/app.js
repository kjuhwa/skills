const output = document.getElementById('output');
const input = document.getElementById('input');

const system = {
  actors: new Map(),
  spawn(name, behavior) {
    if (this.actors.has(name)) return print(`actor '${name}' already exists`, 'err');
    this.actors.set(name, { name, behavior, state: 0, mailbox: [] });
    print(`spawned <${name}> [pid ${this.actors.size}]`, 'actor');
  },
  send(name, msg) {
    const a = this.actors.get(name);
    if (!a) return print(`! no actor named '${name}'`, 'err');
    a.mailbox.push(msg);
    print(`→ ${name}: ${msg}`, 'msg');
    setTimeout(() => this.deliver(a), 250 + Math.random() * 300);
  },
  deliver(a) {
    if (!a.mailbox.length) return;
    const m = a.mailbox.shift();
    const reply = behaviors[a.behavior](a, m);
    if (reply) print(`⇐ ${a.name}: ${reply}`, 'actor');
  },
  kill(name) {
    if (this.actors.delete(name)) print(`☠ ${name} terminated`, 'sys');
    else print(`! no actor named '${name}'`, 'err');
  },
};

const behaviors = {
  counter(a, m) {
    if (m === 'inc') { a.state++; return `count=${a.state}`; }
    if (m === 'dec') { a.state--; return `count=${a.state}`; }
    if (m === 'get') return `count=${a.state}`;
    return `unknown msg: ${m}`;
  },
  echo(a, m) { return `echo: ${m}`; },
  greeter(a, m) { return `hello, ${m}!`; },
  dice(a, m) {
    const faces = parseInt(m) || 6;
    return `rolled ${1 + Math.floor(Math.random() * faces)} (d${faces})`;
  },
};

function print(text, cls = '') {
  const line = document.createElement('div');
  line.className = 'line ' + cls;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

const commands = {
  help() {
    print('Commands:', 'sys');
    print('  spawn <name> <behavior>    behaviors: counter, echo, greeter, dice', 'sys');
    print('  send <name> <message>      deliver message to actor', 'sys');
    print('  list                       show all actors', 'sys');
    print('  kill <name>                terminate actor', 'sys');
    print('  demo                       spawn sample actors', 'sys');
    print('  clear                      clear screen', 'sys');
  },
  spawn(args) {
    const [name, b = 'echo'] = args;
    if (!name) return print('usage: spawn <name> <behavior>', 'err');
    if (!behaviors[b]) return print(`unknown behavior '${b}'. try: ${Object.keys(behaviors).join(', ')}`, 'err');
    system.spawn(name, b);
  },
  send(args) {
    const [name, ...rest] = args;
    if (!name || !rest.length) return print('usage: send <name> <message>', 'err');
    system.send(name, rest.join(' '));
  },
  list() {
    if (!system.actors.size) return print('(no actors)', 'sys');
    system.actors.forEach(a => print(`  <${a.name}> :: ${a.behavior} state=${a.state} mailbox=${a.mailbox.length}`, 'actor'));
  },
  kill(args) {
    if (!args[0]) return print('usage: kill <name>', 'err');
    system.kill(args[0]);
  },
  demo() {
    system.spawn('tally', 'counter');
    system.spawn('parrot', 'echo');
    system.spawn('hi', 'greeter');
    system.spawn('roller', 'dice');
    setTimeout(() => system.send('tally', 'inc'), 100);
    setTimeout(() => system.send('tally', 'inc'), 300);
    setTimeout(() => system.send('hi', 'world'), 500);
    setTimeout(() => system.send('roller', '20'), 700);
  },
  clear() { output.innerHTML = ''; },
};

input.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const raw = input.value.trim();
  input.value = '';
  if (!raw) return;
  print(`› ${raw}`, 'cmd');
  const [cmd, ...args] = raw.split(/\s+/);
  const fn = commands[cmd];
  if (fn) fn(args);
  else print(`! unknown command '${cmd}'. type 'help'.`, 'err');
});

print('actor-repl ready. Type "help" or "demo" to begin.', 'sys');
print('', '');