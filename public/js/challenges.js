/**
 * DEBUGGED - CS Orientation Edition
 * Adaptive challenge engine: Python basics, SQL basics, logic puzzles, simple AI/tech questions.
 * Target audience: first-year CS students (CBSE Class 11/12 level).
 *
 * Tier 1 = anyone can answer (puzzles, very basic Python/tech)
 * Tier 2 = easy Python / SQL
 * Tier 3 = medium (output tracing, SQL clauses)
 * Tier 4 = Class 12 level (functions, dicts, GROUP BY / HAVING, tricky output)
 *
 * Guaranteed zero-repetition per run using seen-ID tracking.
 */

// ---------------------------------------------------------------------------
// Authoring helpers (keep the question bank compact; output shapes match the renderers)
// ---------------------------------------------------------------------------

// Spot the bug: lines = [[text, isBug(1/0)], ...] (exactly one bug per question)
const sb = (id, tier, title, instruction, lines) => ({
  id, tier, title, icon: 'bug', instruction,
  lines: lines.map(([text, bug]) => ({ text, isBug: !!bug }))
});

// Imposter: three valid snippets + one invalid; order is shuffled at pick time
const imp = (id, tier, instruction, valid, bad, title = 'FIND THE IMPOSTER') => ({
  id, tier, title, icon: 'shield-alert', instruction,
  options: [...valid.map(code => ({ code, isImposter: false })), { code: bad, isImposter: true }]
});

// Multiple choice quiz: options[0] is the correct answer; shuffled at pick time
const q = (id, tier, title, instruction, right, wrong, icon = 'brain') => ({
  id, tier, title, icon, instruction, options: [right, ...wrong], correct: 0
});

// Code box + choices (output prediction / fill-in-the-blank): options[0] is correct; shuffled at pick time
const cs = (id, tier, title, instruction, steps, right, wrong) => ({
  id, tier, title, icon: 'layers', instruction, steps, options: [right, ...wrong], correct: 0
});

// Memory flash
const mem = (id, tier, title, sequence, question, right, wrong, flashDuration) => ({
  id, tier, title, icon: 'brain', instruction: 'Memorize this!', sequence, question,
  options: [right, ...wrong], correct: 0, flashDuration
});

// Type-in answer: answers[] are accepted spellings (case/space/quote-insensitive). evidence[] makes it a "case file".
const ti = (id, tier, title, instruction, answers, extra = {}) => ({
  id, tier, title, icon: extra.evidence ? 'shield-alert' : 'code', instruction, answers, ...extra
});

// Arrange: lines[] is the CORRECT order; the client shuffles. mono=true renders as code.
const ar = (id, tier, title, instruction, lines, mono = true) => ({
  id, tier, title, icon: 'layers', instruction, lines, mono
});

// Group of four: pick the 4 cards that belong to the stated group out of 16.
const gf = (id, tier, title, instruction, right, wrong, mono = false) => ({
  id, tier, title, icon: 'target', instruction, right, wrong, mono
});

const CHALLENGES_DB = {
  // =========================================================================
  // 1. SPOT THE BUG (tap the faulty line)
  // =========================================================================
  spot_bug: [
    // --- TIER 1 ---
    sb('sb_t1_1', 1, 'PYTHON TYPO', 'One line has a typo. Tap it!', [
      ['name = "Asha"', 0], ['prnt(name)', 1]
    ]),
    sb('sb_t1_2', 1, 'MISSING COLON', 'Python forgot something after the if. Tap the line!', [
      ['age = 18', 0], ['if age >= 18', 1], ['    print("Adult")', 0]
    ]),
    sb('sb_t1_3', 1, 'SQL TYPO', 'Spot the misspelled SQL keyword!', [
      ['SELCT * FROM students;', 1]
    ]),
    sb('sb_t1_4', 1, 'BROKEN STRING', 'Which line has a string that never closes?', [
      ['print("Hello")', 0], ['print("Welcome to CS)', 1], ['print("Bye")', 0]
    ]),
    sb('sb_t1_5', 1, 'CASE MATTERS', 'Python is case-sensitive. Tap the wrong line!', [
      ['x = 10', 0], ['Print(x)', 1]
    ]),
    sb('sb_t1_6', 1, 'SQL TYPO', 'Spot the misspelled keyword!', [
      ['SELECT name', 0], ['FORM students;', 1]
    ]),

    // --- TIER 2 ---
    sb('sb_t2_1', 2, 'ASSIGN VS COMPARE', 'One line uses the wrong operator. Tap it!', [
      ['x = 5', 0], ['if x = 5:', 1], ['    print("five")', 0]
    ]),
    sb('sb_t2_2', 2, 'INDENTATION', 'Python needs indentation inside a loop. Tap the bad line!', [
      ['for i in range(3):', 0], ['print(i)', 1]
    ]),
    sb('sb_t2_3', 2, 'SQL TEXT VALUE', 'Text values need quotes in SQL. Tap the bad line!', [
      ['SELECT * FROM students', 0], ['WHERE name = Riya;', 1]
    ]),
    sb('sb_t2_4', 2, 'LIST INDEX', 'This list has 2 items. Which line crashes?', [
      ['fruits = ["apple", "banana"]', 0], ['print(fruits[2])', 1]
    ]),
    sb('sb_t2_5', 2, 'WHILE LOOP', 'Spot the syntax error!', [
      ['count = 0', 0], ['while count < 3', 1], ['    count = count + 1', 0]
    ]),
    sb('sb_t2_6', 2, 'EXTRA COMMA', 'Which SQL line has a stray comma?', [
      ['SELECT name,', 1], ['FROM students;', 0]
    ]),

    // --- TIER 3 ---
    sb('sb_t3_1', 3, 'TEXT + NUMBER', 'input() gives text. Which line will crash?', [
      ['x = input("Number: ")', 0], ['y = x + 5', 1], ['print(y)', 0]
    ]),
    sb('sb_t3_2', 3, 'FUNCTION BODY', 'The function body must be indented. Tap the bad line!', [
      ['def add(a, b):', 0], ['return a + b', 1], ['print(add(2, 3))', 0]
    ]),
    sb('sb_t3_3', 3, 'SQL ORDER', 'Spot the incomplete SQL clause!', [
      ['SELECT COUNT(*)', 0], ['FROM students', 0], ['WHERE marks > 80', 0], ['ORDER marks;', 1]
    ]),
    sb('sb_t3_4', 3, 'CONDITION', 'Python cannot read this condition. Tap it!', [
      ['x = 7', 0], ['if x > 5 and < 10:', 1], ['    print("in range")', 0]
    ]),
    sb('sb_t3_5', 3, 'SUM LOOP', 'This loop never updates total. Tap the bad line!', [
      ['total = 0', 0], ['for n in [1, 2, 3]:', 0], ['    total + n', 1], ['print(total)', 0]
    ]),
    sb('sb_t3_6', 3, 'SQL DELETE', 'Spot the wrong SQL statement!', [
      ['DELETE * FROM students', 1], ['WHERE id = 3;', 0]
    ]),

    // --- TIER 4 ---
    sb('sb_t4_1', 4, 'TUPLE TRAP', 'One line crashes. Which one?', [
      ['names = ("Ann", "Bob")', 0], ['names[0] = "Zed"', 1], ['print(names)', 0]
    ]),
    sb('sb_t4_2', 4, 'DICT KEY', 'Which line raises a KeyError?', [
      ['d = {"a": 1}', 0], ['print(d["a"])', 0], ['print(d["b"])', 1]
    ]),
    sb('sb_t4_3', 4, 'NONE SURPRISE', 'print(f(4)) shows None. Which line is to blame?', [
      ['def f(x):', 0], ['    x * 2', 1], ['print(f(4))', 0]
    ]),
    sb('sb_t4_4', 4, 'WHERE VS HAVING', 'Aggregates cannot go in WHERE. Tap the bad line!', [
      ['SELECT dept, COUNT(*)', 0], ['FROM emp', 0], ['WHERE COUNT(*) > 2', 1], ['GROUP BY dept;', 0]
    ]),
    sb('sb_t4_5', 4, 'INFINITE LOOP', 'This loop never ends. Which line causes it?', [
      ['i = 0', 0], ['while i < 3:', 0], ['    print(i)', 0], ['    i = i - 1', 1]
    ]),
    sb('sb_t4_6', 4, 'STRINGS ARE FIXED', 'Strings cannot be changed in place. Tap the crash!', [
      ['s = "hello"', 0], ['s[0] = "H"', 1], ['print(s)', 0]
    ])
  ],

  // =========================================================================
  // 2. FIND THE IMPOSTER (3 valid snippets, 1 invalid)
  // =========================================================================
  imposter: [
    // --- TIER 1 ---
    imp('imp_t1_1', 1, 'Which line is NOT valid Python?',
      ['print("Hello")', 'print(10)', "print('Hi')"], 'print "Hello"'),
    imp('imp_t1_2', 1, 'Which one is NOT a real SQL command?',
      ['SELECT * FROM t;', 'SELECT name FROM t;', 'SELECT 1;'], 'GET * FROM t;'),
    imp('imp_t1_3', 1, 'Which is NOT a valid Python variable name?',
      ['age', 'my_name', 'score1'], '1score'),
    imp('imp_t1_4', 1, 'Which is NOT a Python comment?',
      ['# this is a comment', 'x = 5  # five', '# TODO: fix'], '// this is a comment'),

    // --- TIER 2 ---
    imp('imp_t2_1', 2, 'Which is NOT a valid Python list?',
      ['[1, 2, 3]', '["a", "b"]', '[]'], '[1, 2, 3'),
    imp('imp_t2_2', 2, 'Which SQL query is broken?',
      ['SELECT name FROM s WHERE id = 1;', 'SELECT * FROM s WHERE marks > 50;', 'SELECT id FROM s WHERE id = 2;'],
      'SELECT name FROM s WHERE;'),
    imp('imp_t2_3', 2, 'Which loop is NOT Python?',
      ['for i in range(5):', 'while x < 3:', 'for c in "hi":'], 'for (i = 0; i < 5; i++):'),
    imp('imp_t2_4', 2, 'Which is NOT a real SQL command?',
      ['DELETE FROM s;', 'INSERT INTO s VALUES (1);', 'UPDATE s SET m = 5;'], 'REMOVE FROM s;'),

    // --- TIER 3 ---
    imp('imp_t3_1', 3, 'Which function definition is NOT Python?',
      ['def hi():', 'def add(a, b):', 'def sq(x): return x * x'], 'function hi():'),
    imp('imp_t3_2', 3, 'Which is NOT a valid Python dictionary?',
      ['{"a": 1, "b": 2}', '{"x": 10}', '{}'], '{"a" = 1}'),
    imp('imp_t3_3', 3, 'Which SQL query is broken?',
      ['SELECT name FROM s ORDER BY marks DESC;', 'SELECT COUNT(*) FROM s;', 'SELECT MAX(marks) FROM s;'],
      'SELECT * FROM s GROUP marks;'),
    imp('imp_t3_4', 3, 'Which condition is NOT valid Python?',
      ['if x == 5:', 'if x > 3 and x < 9:', 'elif x == 2:'], 'if x == 5 then:'),

    // --- TIER 4 ---
    imp('imp_t4_1', 4, 'Three lines print 6. Which one does NOT?',
      ['print(2 * 3)', 'print(12 // 2)', 'print(18 % 12)'], 'print(2 ** 3)', 'ODD OUTPUT'),
    imp('imp_t4_2', 4, 'Three lines print 4. Which one does NOT?',
      ['print(len("abcd"))', 'print(2 + 2)', 'print(8 // 2)'], 'print(9 % 4)', 'ODD OUTPUT'),
    imp('imp_t4_3', 4, 'Three queries return ONE value. Which one does NOT?',
      ['SELECT COUNT(*) FROM s;', 'SELECT MAX(m) FROM s;', 'SELECT AVG(m) FROM s;'],
      'SELECT name FROM s;', 'ODD OUTPUT'),
    imp('imp_t4_4', 4, 'Three lines print "py". Which one does NOT?',
      ['print("python"[0:2])', 'print("pyth"[:2])', 'print("xpy"[1:])'], 'print("python"[2:4])', 'ODD OUTPUT')
  ],

  // =========================================================================
  // 3. QUIZ (multiple choice: puzzles, SQL concepts, AI, tech basics)
  // =========================================================================
  quiz: [
    // --- TIER 1 ---
    q('qz_t1_1', 1, 'NUMBER PATTERN', 'What comes next? 2, 4, 6, 8, ?', '10', ['9', '12', '11'], 'zap'),
    q('qz_t1_2', 1, 'ODD ONE OUT', 'Which one does not belong?', 'Carrot', ['Apple', 'Banana', 'Mango'], 'target'),
    q('qz_t1_3', 1, 'ODD ONE OUT', 'Which one is NOT a programming language?', 'Chrome', ['Python', 'Java', 'C++'], 'target'),
    q('qz_t1_4', 1, 'QUICK MATHS', 'What is 5 + 5 × 2 ?', '15', ['20', '12', '25'], 'zap'),
    q('qz_t1_5', 1, 'BIGGEST NUMBER', 'Which number is the biggest?', '0.75', ['0.5', '0.25', '0.6'], 'zap'),
    q('qz_t1_6', 1, 'TECH BASICS', 'What does CPU stand for?', 'Central Processing Unit',
      ['Computer Personal Unit', 'Central Program Utility', 'Core Power Unit'], 'cpu'),
    q('qz_t1_7', 1, 'TECH BASICS', 'Which of these is an INPUT device?', 'Keyboard', ['Monitor', 'Printer', 'Speaker'], 'cpu'),
    q('qz_t1_8', 1, 'TECH BASICS', 'How many bits are in 1 byte?', '8', ['4', '16', '10'], 'cpu'),
    q('qz_t1_9', 1, 'SQL BASICS', 'What does SQL stand for?', 'Structured Query Language',
      ['Simple Question Language', 'Sorted Query List', 'Standard Quick Logic'], 'server'),
    q('qz_t1_10', 1, 'SQL BASICS', 'Which SQL command READS data from a table?', 'SELECT', ['DELETE', 'DROP', 'MAKE'], 'server'),
    q('qz_t1_11', 1, 'AI BASICS', 'What does AI stand for?', 'Artificial Intelligence',
      ['Automatic Internet', 'Advanced Input', 'Active Interface'], 'bot'),
    q('qz_t1_12', 1, 'AI BASICS', 'Which of these is an AI chatbot?', 'ChatGPT', ['Notepad', 'Paint', 'Calculator'], 'bot'),

    // --- TIER 2 ---
    q('qz_t2_1', 2, 'NUMBER PATTERN', 'What comes next? 1, 2, 4, 8, 16, ?', '32', ['24', '30', '20'], 'zap'),
    q('qz_t2_2', 2, 'LETTER PATTERN', 'What comes next? A, C, E, G, ?', 'I', ['H', 'J', 'K'], 'zap'),
    q('qz_t2_3', 2, 'PRIME TIME', 'Which of these is NOT a prime number?', '9', ['2', '5', '11'], 'zap'),
    q('qz_t2_4', 2, 'CALENDAR', 'Today is Monday. What day is it after 10 days?', 'Thursday',
      ['Wednesday', 'Friday', 'Sunday'], 'target'),
    q('qz_t2_5', 2, 'CLOCK', 'At 3:00, what is the angle between the hour and minute hand?', '90°',
      ['60°', '180°', '45°'], 'target'),
    q('qz_t2_6', 2, 'TECH BASICS', 'Which of these is an operating system?', 'Windows',
      ['Chrome', 'Excel', 'Word'], 'cpu'),
    q('qz_t2_7', 2, 'SQL BASICS', 'Which keyword filters rows in a query?', 'WHERE', ['FILTER', 'FIND', 'ONLY'], 'server'),
    q('qz_t2_8', 2, 'SQL BASICS', 'Which command adds a new row to a table?', 'INSERT INTO', ['ADD ROW', 'APPEND', 'PUT'], 'server'),
    q('qz_t2_9', 2, 'SQL BASICS', 'A single row in a table is also called a...', 'Record', ['Column', 'Field name', 'Database'], 'server'),
    q('qz_t2_10', 2, 'PYTHON BASICS', 'Which symbol starts a comment in Python?', '#', ['//', '/*', '--'], 'code'),
    q('qz_t2_11', 2, 'AI BASICS', 'What does ML stand for?', 'Machine Learning',
      ['Main Logic', 'Multiple Languages', 'Manual Loop'], 'bot'),
    q('qz_t2_12', 2, 'AI BASICS', 'An AI model learns mainly from...', 'Data', ['Electricity', 'Passwords', 'Screens'], 'bot'),

    // --- TIER 3 ---
    q('qz_t3_1', 3, 'NUMBER PATTERN', 'What comes next? 3, 6, 11, 18, ?', '27', ['24', '26', '30'], 'zap'),
    q('qz_t3_2', 3, 'FIBONACCI', 'What comes next? 1, 1, 2, 3, 5, 8, ?', '13', ['11', '12', '15'], 'zap'),
    q('qz_t3_3', 3, 'BINARY', 'What is binary 101 in decimal?', '5', ['3', '6', '7'], 'zap'),
    q('qz_t3_4', 3, 'RIDDLE', 'A pen and notebook cost ₹110. The notebook costs ₹100 more than the pen. What does the pen cost?',
      '₹5', ['₹10', '₹15', '₹20'], 'target'),
    q('qz_t3_5', 3, 'HEX', 'What is the hexadecimal digit F in decimal?', '15', ['10', '16', '14'], 'zap'),
    q('qz_t3_6', 3, 'SQL BASICS', 'Which clause sorts the results?', 'ORDER BY', ['SORT', 'ARRANGE', 'GROUP'], 'server'),
    q('qz_t3_7', 3, 'SQL BASICS', 'The table students has 4 rows. What does SELECT COUNT(*) FROM students return?',
      '4', ['1', '0', 'The names'], 'server'),
    q('qz_t3_8', 3, 'SQL BASICS', 'What does a PRIMARY KEY do?', 'Uniquely identifies each row',
      ['Encrypts the table', 'Sorts the table', 'Deletes duplicates'], 'server'),
    q('qz_t3_9', 3, 'SQL BASICS', 'Which keyword removes duplicate values from results?', 'DISTINCT',
      ['UNIQUE ONLY', 'REMOVE', 'SINGLE'], 'server'),
    q('qz_t3_10', 3, 'AI BASICS', 'What is a "prompt" when using an AI chatbot?', 'The instruction you give it',
      ['A system error', 'A type of virus', 'Its battery level'], 'bot'),
    q('qz_t3_11', 3, 'AI BASICS', 'When an AI confidently makes up false facts, it is called...', 'Hallucination',
      ['Compilation', 'Encryption', 'Debugging'], 'bot'),
    q('qz_t3_12', 3, 'PYTHON BASICS', 'Which data type is the value 3.14 in Python?', 'float', ['int', 'str', 'bool'], 'code'),

    // --- TIER 4 ---
    q('qz_t4_1', 4, 'NUMBER PATTERN', 'What comes next? 2, 6, 12, 20, 30, ?', '42', ['40', '38', '36'], 'zap'),
    q('qz_t4_2', 4, 'BINARY', 'What is binary 1101 in decimal?', '13', ['11', '12', '14'], 'zap'),
    q('qz_t4_3', 4, 'BINARY', 'What is decimal 10 in binary?', '1010', ['1001', '1100', '0101'], 'zap'),
    q('qz_t4_4', 4, 'MACHINES', '5 machines make 5 items in 5 minutes. How long do 100 machines take to make 100 items?',
      '5 minutes', ['100 minutes', '20 minutes', '1 minute'], 'target'),
    q('qz_t4_5', 4, 'SQL BASICS', 'Which clause filters groups AFTER GROUP BY?', 'HAVING', ['WHERE', 'FILTER', 'ORDER BY'], 'server'),
    q('qz_t4_6', 4, 'SQL BASICS', 'Which SQL operation combines rows from two tables?', 'JOIN', ['MERGE ROWS', 'UNION ALL TABLES', 'COMBINE'], 'server'),
    q('qz_t4_7', 4, 'SQL BASICS', 'A FOREIGN KEY refers to...', 'The primary key of another table',
      ['A password column', 'The first row', 'A hidden table'], 'server'),
    q('qz_t4_8', 4, 'SQL BASICS', 'Marks are 40, 70 and 90. What does SELECT MAX(marks) - MIN(marks) return?',
      '50', ['30', '90', '20'], 'server'),
    q('qz_t4_9', 4, 'AI BASICS', 'Neural networks are loosely inspired by...', 'The human brain',
      ['The internet', 'Calculators', 'Search engines'], 'bot'),
    q('qz_t4_10', 4, 'AI BASICS', 'In supervised learning, the training data is...', 'Labelled with correct answers',
      ['Random noise', 'Deleted after use', 'Always images'], 'bot'),
    q('qz_t4_11', 4, 'PYTHON BASICS', 'Which Python data type is immutable (cannot be changed)?', 'tuple',
      ['list', 'dict', 'set'], 'code'),
    q('qz_t4_12', 4, 'PYTHON BASICS', 'Which keyword defines a function in Python?', 'def', ['func', 'function', 'fn'], 'code'),

    // --- TRUE OR FALSE (fast, 2 options) ---
    q('tf_t1_1', 1, 'TRUE OR FALSE', 'Python is a programming language.', 'True', ['False'], 'zap'),
    q('tf_t1_2', 1, 'TRUE OR FALSE', '1 byte is 4 bits.', 'False', ['True'], 'zap'),
    q('tf_t2_1', 2, 'TRUE OR FALSE', 'A Python list is written with curly braces { }.', 'False', ['True'], 'zap'),
    q('tf_t2_2', 2, 'TRUE OR FALSE', 'SQL is used to talk to databases.', 'True', ['False'], 'zap'),
    q('tf_t3_1', 3, 'TRUE OR FALSE', 'In Python, 5 == "5" is True.', 'False', ['True'], 'zap'),
    q('tf_t3_2', 3, 'TRUE OR FALSE', 'A PRIMARY KEY value can repeat in a table.', 'False', ['True'], 'zap'),
    q('tf_t3_3', 3, 'TRUE OR FALSE', 'Python list positions start at 0.', 'True', ['False'], 'zap'),
    q('tf_t4_1', 4, 'TRUE OR FALSE', 'A tuple can be changed after it is created.', 'False', ['True'], 'zap'),
    q('tf_t4_2', 4, 'TRUE OR FALSE', '"abc".upper() gives "ABC".', 'True', ['False'], 'zap')
  ],

  // =========================================================================
  // 4. CODE SEQUENCE (predict the output / fill in the blank)
  // =========================================================================
  code_sequence: [
    // --- TIER 1 ---
    cs('cs_t1_1', 1, 'PREDICT THE OUTPUT', 'What does this print?', ['print(2 + 3)'], '5', ['23', '2 + 3', 'Error']),
    cs('cs_t1_2', 1, 'PREDICT THE OUTPUT', 'What does this print?', ['x = 4', 'print(x * 2)'], '8', ['6', '42', 'x * 2']),
    cs('cs_t1_3', 1, 'PREDICT THE OUTPUT', 'What does this print?', ['print("Hi" + "!")'], 'Hi!', ['Hi !', 'Hi+!', 'Error']),
    cs('cs_t1_4', 1, 'FILL THE BLANK', 'Which word prints text on screen?', ['______("Hello")'], 'print', ['show', 'echo', 'say']),
    cs('cs_t1_5', 1, 'PREDICT THE OUTPUT', 'What does this print?', ['name = "Raj"', 'print(name)'], 'Raj', ['name', '"Raj"', 'Error']),
    cs('cs_t1_6', 1, 'FILL THE BLANK', 'Which SQL word completes the query?', ['SELECT * ______ students;'], 'FROM', ['IN', 'OF', 'AT']),
    cs('cs_t1_7', 1, 'PREDICT THE OUTPUT', 'What does this print?', ['print(10 - 4)'], '6', ['14', '4', '104']),
    cs('cs_t1_8', 1, 'PREDICT THE OUTPUT', 'What does this print?', ['a = 3', 'b = 4', 'print(a + b)'], '7', ['34', '12', 'a + b']),

    // --- TIER 2 ---
    cs('cs_t2_1', 2, 'PREDICT THE OUTPUT', 'What does this print?', ['for i in range(3):', '    print(i)'],
      '0, 1, 2', ['1, 2, 3', '0, 1, 2, 3', '1, 2']),
    cs('cs_t2_2', 2, 'PREDICT THE OUTPUT', 'What does this print?', ['print(10 // 3)'], '3', ['3.33', '1', '10']),
    cs('cs_t2_3', 2, 'PREDICT THE OUTPUT', 'What does this print?', ['print(10 % 3)'], '1', ['3', '0', '3.33']),
    cs('cs_t2_4', 2, 'PREDICT THE OUTPUT', 'What does this print?', ['print(len("Python"))'], '6', ['5', '7', 'Python']),
    cs('cs_t2_5', 2, 'FILL THE BLANK', 'Which function makes 0, 1, 2, 3, 4?', ['for i in ______(5):', '    print(i)'],
      'range', ['count', 'list', 'repeat']),
    cs('cs_t2_6', 2, 'PREDICT THE OUTPUT', 'What does this print?',
      ['x = 7', 'if x > 5:', '    print("big")', 'else:', '    print("small")'], 'big', ['small', '7', 'Error']),
    cs('cs_t2_7', 2, 'FILL THE BLANK', 'Which SQL word filters rows?', ['SELECT * FROM students', '______ marks > 80;'],
      'WHERE', ['IF', 'WHEN', 'FILTER']),
    cs('cs_t2_8', 2, 'PREDICT THE OUTPUT', 'What does this print?', ['print("a" + "b" + "c")'], 'abc', ['a b c', 'a+b+c', 'Error']),

    // --- TIER 3 ---
    cs('cs_t3_1', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['nums = [1, 2, 3]', 'nums.append(4)', 'print(len(nums))'],
      '4', ['3', '5', '[1, 2, 3, 4]']),
    cs('cs_t3_2', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['print("ab" * 3)'], 'ababab', ['ab3', 'ab ab ab', 'Error']),
    cs('cs_t3_3', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['x = 10', 'x += 5', 'print(x)'], '15', ['10', '5', '105']),
    cs('cs_t3_4', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['print(2 ** 4)'], '16', ['8', '6', '24']),
    cs('cs_t3_5', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['s = "hello"', 'print(s[1])'], 'e', ['h', 'l', 'hello']),
    cs('cs_t3_6', 3, 'FILL THE BLANK', 'Complete the SQL to sort by marks, highest first.',
      ['SELECT name FROM students', '______ marks DESC;'], 'ORDER BY', ['SORT BY', 'GROUP BY', 'ARRANGE']),
    cs('cs_t3_7', 3, 'PREDICT THE OUTPUT', 'What does this print?',
      ['total = 0', 'for i in range(1, 4):', '    total += i', 'print(total)'], '6', ['10', '3', '4']),
    cs('cs_t3_8', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['print(type(5.0))'], "<class 'float'>",
      ["<class 'int'>", "<class 'str'>", '5.0']),
    cs('cs_t3_9', 3, 'PREDICT THE OUTPUT', 'What does this print?', ['a = [5, 8, 2]', 'print(max(a))'], '8', ['5', '2', '15']),
    cs('cs_t3_10', 3, 'SQL TABLE', 'students has marks 40, 70, 90. What does this return?',
      ['SELECT COUNT(*) FROM students', 'WHERE marks > 50;'], '2', ['3', '1', '70']),

    // --- TIER 4 ---
    cs('cs_t4_1', 4, 'PREDICT THE OUTPUT', 'What does this print?',
      ['def f(x):', '    return x * 2', 'print(f(f(3)))'], '12', ['6', '9', '8']),
    cs('cs_t4_2', 4, 'NESTED LOOPS', 'How many lines does this print?',
      ['for i in range(2):', '    for j in range(2):', '        print(i, j)'], '4', ['2', '3', '6']),
    cs('cs_t4_3', 4, 'PREDICT THE OUTPUT', 'What does this print?', ['a = [3, 1, 2]', 'a.sort()', 'print(a)'],
      '[1, 2, 3]', ['[3, 1, 2]', '[3, 2, 1]', 'None']),
    cs('cs_t4_4', 4, 'PREDICT THE OUTPUT', 'What does this print?', ['print("python"[::-1])'], 'nohtyp', ['python', 'p', 'Error']),
    cs('cs_t4_5', 4, 'PREDICT THE OUTPUT', 'What does this print?',
      ['d = {"a": 1, "b": 2}', 'print(d["b"] + len(d))'], '4', ['3', '2', '5']),
    cs('cs_t4_6', 4, 'WHILE LOOP', 'What does this print?', ['x = 5', 'while x > 0:', '    x -= 2', 'print(x)'],
      '-1', ['0', '1', '-2']),
    cs('cs_t4_7', 4, 'PREDICT THE OUTPUT', 'What does this print?', ['print(7 // 2 + 7 % 2)'], '4', ['3', '4.5', '5']),
    cs('cs_t4_8', 4, 'FILL THE BLANK', 'Complete the SQL to count employees per department.',
      ['SELECT dept, COUNT(*) FROM emp', '______ dept;'], 'GROUP BY', ['ORDER BY', 'HAVING', 'WHERE']),
    cs('cs_t4_9', 4, 'PREDICT THE OUTPUT', 'What does this print?',
      ['def greet(n="World"):', '    return "Hi " + n', 'print(greet())'], 'Hi World', ['Hi', 'Hi n', 'Error']),
    cs('cs_t4_10', 4, 'PREDICT THE OUTPUT', 'What does this print?',
      ['x = [1, 2, 3]', 'y = x', 'y.append(4)', 'print(len(x))'], '4', ['3', '7', 'Error'])
  ],

  // =========================================================================
  // 8. TYPE IT IN (short typed answers)
  // =========================================================================
  type_in: [
    // --- TIER 1 ---
    ti('ti_t1_1', 1, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['7'], { steps: ['print(4 + 3)'], numeric: true }),
    ti('ti_t1_2', 1, 'TYPE THE ANSWER', 'How many bits are in one byte?', ['8'], { numeric: true }),
    ti('ti_t1_3', 1, 'NEXT NUMBER', 'What comes next? 5, 10, 15, ?', ['20'], { numeric: true }),
    ti('ti_t1_4', 1, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['4'], { steps: ['x = 6', 'print(x - 2)'], numeric: true }),
    // --- TIER 2 ---
    ti('ti_t2_1', 2, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['4'], { steps: ['print(len("code"))'], numeric: true }),
    ti('ti_t2_2', 2, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['1'], { steps: ['print(7 % 2)'], numeric: true }),
    ti('ti_t2_3', 2, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['ababab'], { steps: ['print(3 * "ab")'] }),
    ti('ti_t2_4', 2, 'FILL THE BLANK', 'Type the missing SQL word.', ['from'], { steps: ['SELECT * ______ students;'] }),
    ti('ti_t2_5', 2, 'FILL THE BLANK', 'Type the missing Python word.', ['for'], { steps: ['______ i in range(3):', '    print(i)'] }),
    // --- TIER 3 ---
    ti('ti_t3_1', 3, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['32'], { steps: ['print(2 ** 5)'], numeric: true }),
    ti('ti_t3_2', 3, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['9'], { steps: ['nums = [4, 9, 1]', 'print(max(nums))'], numeric: true }),
    ti('ti_t3_3', 3, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['n'], { steps: ['s = "python"', 'print(s[-1])'] }),
    ti('ti_t3_4', 3, 'TYPE THE SQL WORD', 'Which SQL keyword removes duplicate values from results?', ['distinct']),
    ti('ti_t3_5', 3, 'BINARY TO DECIMAL', 'What is binary 1010 in decimal?', ['10'], { numeric: true }),
    // --- TIER 4 ---
    ti('ti_t4_1', 4, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['4'], { steps: ['print(10 // 3 + 10 % 3)'], numeric: true }),
    ti('ti_t4_2', 4, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['10'], { steps: ['x = [1, 2, 3]', 'x.append(4)', 'print(sum(x))'], numeric: true }),
    ti('ti_t4_3', 4, 'TYPE THE OUTPUT', 'What does this print? Type it.', ['hello'], { steps: ['print("HELLO".lower())'] }),
    ti('ti_t4_4', 4, 'TYPE THE OUTPUT', 'How many numbers does this make?', ['3'], { steps: ['print(len(list(range(2, 10, 3))))'], numeric: true })
  ],

  // =========================================================================
  // 9. CASE FILE (simple decode / log / OSINT-style puzzles; every clue is on screen)
  // =========================================================================
  case_file: [
    // --- TIER 1 ---
    ti('cf_t1_1', 1, 'CASE FILE: DECODE', 'Every letter was moved 3 forward (A became D). Move back 3. What is the word?', ['hello'],
      { evidence: ['Secret message:', 'KHOOR'] }),
    ti('cf_t1_2', 1, 'CASE FILE: BACKWARDS', 'The word was written backwards. What is it?', ['python'],
      { evidence: ['Intercepted note:', 'NOHTYP'] }),
    ti('cf_t1_3', 1, 'CASE FILE: WHO, WHERE', 'Which lab room is Aarav in? Type the room number.', ['204'],
      { evidence: ['Post by @aarav_21', 'Caption: "Day 1 at college! Lab 204, Block C"', 'Photo tag: Computer Science Lab'], numeric: true }),
    ti('cf_t1_4', 1, 'CASE FILE: FILES', 'Which folder is the secret one? Type its name.', ['secret-lab', 'secret_lab', 'secretlab'],
      { evidence: ['robots.txt', 'Disallow: /images', 'Disallow: /secret-lab', 'Disallow: /css'] }),
    // --- TIER 2 ---
    ti('cf_t2_1', 2, 'CASE FILE: DECODE', 'Every letter was moved 2 forward. Move back 2. What is the word?', ['code'],
      { evidence: ['Secret message:', 'EQFG'] }),
    ti('cf_t2_2', 2, 'CASE FILE: LOGS', 'Which IP address failed to log in twice? Type it.', ['10.0.0.9'],
      { evidence: ['10:01  login OK    user=asha', '10:03  login FAIL  user=root  ip=10.0.0.9', '10:04  login FAIL  user=root  ip=10.0.0.9', '10:09  login OK    user=dev'] }),
    ti('cf_t2_3', 2, 'CASE FILE: PROFILE', 'In which month is the birthday? Type the month.', ['august', 'aug'],
      { evidence: ['Username: night_coder_7', 'Bio: Loves Python. Born 14 Aug. CS Batch of 2029', 'Posted from: Hostel B, Room 12'] }),
    ti('cf_t2_4', 2, 'CASE FILE: METADATA', 'Who wrote this file? Type the surname.', ['mehta'],
      { evidence: ['File: notes_final.pdf', 'Author: R. Mehta', 'Created: 03-Jun-2026', 'Software: LibreOffice'] }),
    ti('cf_t2_5', 2, 'CASE FILE: WHERE', 'Which floor was this photo taken on? Type the number.', ['5'],
      { evidence: ['Photo caption: "Sunrise from the 5th floor, Library Block"', 'Taken at: 06:12', 'Wi-Fi name in photo: LIB_5F'], numeric: true }),
    // --- TIER 3 ---
    ti('cf_t3_1', 3, 'CASE FILE: HEX', 'Hex 41 is A, 42 is B, 43 is C and so on. Decode the two letters.', ['hi'],
      { evidence: ['48 49'] }),
    ti('cf_t3_2', 3, 'CASE FILE: URL', 'What is the coupon code in this link?', ['fresher10'],
      { evidence: ['https://shop.example.com/cart?item=pen&qty=3&coupon=FRESHER10'] }),
    ti('cf_t3_3', 3, 'CASE FILE: PHISHING', 'Type the one word in the subject that is trying to make you panic.', ['urgent'],
      { evidence: ['From: support@ok-bank-secure.xyz', 'Subject: URGENT verify your password', 'Link: http://ok-bank-secure.xyz/verify'] }),
    ti('cf_t3_4', 3, 'CASE FILE: DECODE', 'Shifted forward by 1. It is a thing on your desk. What is it?', ['computer'],
      { evidence: ['Secret message:', 'DPNQVUFS'] }),
    // --- TIER 4 ---
    ti('cf_t4_1', 4, 'CASE FILE: BINARY', 'Binary 01000001 is A, and the next numbers are B, C, D... Decode the two letters.', ['hi'],
      { evidence: ['01001000 01001001'] }),
    ti('cf_t4_2', 4, 'CASE FILE: SERVER LOG', 'How many failed logins (status 401) are there? Type the number.', ['2'],
      { evidence: ['GET  /index.html  200', 'GET  /login       200', 'POST /login       401', 'POST /login       401', 'POST /login       200', 'GET  /admin       403'], numeric: true }),
    ti('cf_t4_3', 4, 'CASE FILE: ATTACK NAME', 'Typing this into a login box is a classic trick. Complete the name: SQL ______', ['injection'],
      { evidence: ['Username box:', "' OR '1'='1"] })
  ],

  // =========================================================================
  // 10. ARRANGE (tap lines into the right order)
  // =========================================================================
  arrange: [
    // --- TIER 1 ---
    ar('ar_t1_1', 1, 'PUT IN ORDER', 'Order the lines so the program prints Aarav.', ['name = "Aarav"', 'print(name)']),
    ar('ar_t1_2', 1, 'PUT IN ORDER', 'Order the SQL query: names of students who scored over 80.', ['SELECT name', 'FROM students', 'WHERE marks > 80;']),
    ar('ar_t1_3', 1, 'PUT IN ORDER', 'Put the steps of making tea in order.', ['Boil the water', 'Add tea leaves', 'Pour into a cup', 'Sip and enjoy'], false),
    // --- TIER 2 ---
    ar('ar_t2_1', 2, 'PUT IN ORDER', 'Order the lines so the program adds up 1, 2 and 3.', ['total = 0', 'for n in [1, 2, 3]:', '    total += n', 'print(total)']),
    ar('ar_t2_2', 2, 'PUT IN ORDER', 'Order the lines so this prints Minor.', ['age = 17', 'if age >= 18:', '    print("Adult")', 'else:', '    print("Minor")']),
    ar('ar_t2_3', 2, 'PUT IN ORDER', 'Order the SQL query: students per department.', ['SELECT dept, COUNT(*)', 'FROM emp', 'GROUP BY dept', 'ORDER BY dept;']),
    // --- TIER 3 ---
    ar('ar_t3_1', 3, 'PUT IN ORDER', 'Order the lines so this prints 16.', ['def square(x):', '    return x * x', 'print(square(4))']),
    ar('ar_t3_2', 3, 'PUT IN ORDER', 'Order the lines so the list prints sorted.', ['nums = [3, 1, 2]', 'nums.sort()', 'print(nums)']),
    ar('ar_t3_3', 3, 'PUT IN ORDER', 'Order the SQL query: best scorers first.', ['SELECT name', 'FROM students', 'WHERE marks > 50', 'ORDER BY marks DESC;']),
    ar('ar_t3_4', 3, 'PUT IN ORDER', 'Put the steps for finding the biggest number in order.',
      ['Start with the first number as the biggest', 'Look at the next number', 'If it is bigger, remember it', 'Repeat until the numbers end', 'Say the biggest number'], false),
    // --- TIER 4 ---
    ar('ar_t4_1', 4, 'PUT IN ORDER', 'Order the lines so this counts 0, 1, 2 then says done.', ['count = 0', 'while count < 3:', '    print(count)', '    count += 1', 'print("done")']),
    ar('ar_t4_2', 4, 'PUT IN ORDER', 'Order the lines so this prints Hi Asha.', ['def greet(name):', '    return "Hi " + name', 'msg = greet("Asha")', 'print(msg)']),
    ar('ar_t4_3', 4, 'PUT IN ORDER', 'Order the lines so this prints 2.', ['d = {}', 'd["a"] = 1', 'd["b"] = 2', 'print(len(d))']),
    ar('ar_t4_4', 4, 'PUT IN ORDER', 'Order the SQL: add a student, fix the mark, then read the table.',
      ['INSERT INTO s VALUES (1, "Asha", 40);', 'UPDATE s SET marks = 90 WHERE id = 1;', 'SELECT * FROM s;'])
  ],

  // =========================================================================
  // 11. GROUP OF FOUR (16 cards, pick the 4 that belong together)
  // =========================================================================
  group_four: [
    // --- TIER 1 ---
    gf('gf_t1_1', 1, 'FIND THE FOUR', 'Pick the 4 Python data types.',
      ['int', 'str', 'float', 'bool'],
      ['SELECT', 'WHERE', 'INSERT', 'DELETE', 'Chrome', 'Firefox', 'Edge', 'Safari', 'Mouse', 'Keyboard', 'Monitor', 'Printer']),
    gf('gf_t1_2', 1, 'FIND THE FOUR', 'Pick the 4 INPUT devices.',
      ['Keyboard', 'Mouse', 'Scanner', 'Microphone'],
      ['Monitor', 'Printer', 'Speaker', 'Projector', 'Python', 'Java', 'C++', 'Ruby', 'Windows', 'Linux', 'Android', 'macOS']),
    gf('gf_t1_3', 1, 'FIND THE FOUR', 'Pick the 4 programming languages.',
      ['Python', 'Java', 'C++', 'JavaScript'],
      ['Windows', 'Linux', 'Android', 'macOS', 'Chrome', 'Edge', 'Firefox', 'Safari', 'Excel', 'Word', 'Paint', 'Notepad']),
    gf('gf_t1_4', 1, 'FIND THE FOUR', 'Pick the 4 EVEN numbers.',
      ['12', '14', '16', '18'],
      ['3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23', '25']),
    // --- TIER 2 ---
    gf('gf_t2_1', 2, 'FIND THE FOUR', 'Pick the 4 SQL keywords.',
      ['SELECT', 'WHERE', 'FROM', 'ORDER'],
      ['for', 'while', 'if', 'def', 'print', 'input', 'range', 'len', 'div', 'span', 'body', 'head'], true),
    gf('gf_t2_2', 2, 'FIND THE FOUR', 'Pick the 4 Python keywords.',
      ['for', 'while', 'if', 'def'],
      ['SELECT', 'WHERE', 'FROM', 'JOIN', 'print', 'len', 'range', 'input', 'div', 'span', 'body', 'head'], true),
    gf('gf_t2_3', 2, 'FIND THE FOUR', 'Pick the 4 SQL aggregate functions.',
      ['COUNT', 'MAX', 'MIN', 'AVG'],
      ['SELECT', 'FROM', 'WHERE', 'JOIN', 'len', 'print', 'range', 'type', 'div', 'span', 'body', 'head'], true),
    gf('gf_t2_4', 2, 'FIND THE FOUR', 'Pick the 4 that are strings in Python.',
      ['"hello"', "'Hi'", '"42"', '"True"'],
      ['42', '3.14', 'True', 'None', '[1, 2]', '(1, 2)', '{1, 2}', '{"a": 1}', '100', '0.5', 'False', '7'], true),
    gf('gf_t2_5', 2, 'FIND THE FOUR', 'Pick the 4 AI terms.',
      ['Neural Network', 'Machine Learning', 'Training Data', 'Chatbot'],
      ['Firewall', 'Router', 'Compiler', 'Spreadsheet', 'Primary Key', 'Foreign Key', 'Table', 'Row', 'Loop', 'Variable', 'Function', 'String']),
    // --- TIER 3 ---
    gf('gf_t3_1', 3, 'FIND THE FOUR', 'Pick the 4 that print 6.',
      ['2 * 3', '12 // 2', '18 % 12', '3 + 3'],
      ['2 ** 3', '7 - 2', '10 // 3', '4 + 3', '5 * 2', '9 % 4', '2 + 2', '3 ** 2', '8 // 3', '15 - 5', '6 * 6', '1 + 1'], true),
    gf('gf_t3_2', 3, 'FIND THE FOUR', 'Pick the 4 clauses you can use inside a SELECT.',
      ['WHERE', 'GROUP BY', 'ORDER BY', 'HAVING'],
      ['print', 'def', 'for', 'while', 'input', 'int', 'str', 'float', 'div', 'span', 'body', 'head'], true),
    gf('gf_t3_3', 3, 'FIND THE FOUR', 'Pick the 4 Python list methods.',
      ['append', 'sort', 'pop', 'reverse'],
      ['keys', 'values', 'items', 'get', 'upper', 'lower', 'strip', 'split', 'SELECT', 'WHERE', 'FROM', 'JOIN'], true),
    gf('gf_t3_4', 3, 'FIND THE FOUR', 'Pick the 4 that are True.',
      ['5 > 3', '2 + 2 == 4', '"a" == "a"', '10 % 2 == 0'],
      ['5 < 3', '2 + 2 == 5', '"a" == "b"', '10 % 3 == 0', '4 > 7', '1 == 2', '3 != 3', '9 < 1', '7 == 8', '6 > 9', '0 > 1', '5 == 6'], true),
    // --- TIER 4 ---
    gf('gf_t4_1', 4, 'FIND THE FOUR', 'Pick the 4 immutable Python types (they cannot be changed).',
      ['tuple', 'str', 'int', 'float'],
      ['list', 'dict', 'set', 'bytearray', 'SELECT', 'WHERE', 'FROM', 'JOIN', 'div', 'span', 'body', 'head'], true),
    gf('gf_t4_2', 4, 'FIND THE FOUR', 'Pick the 4 that raise an error in Python.',
      ['1 / 0', '"a" + 1', 'int("x")', '[1, 2][5]'],
      ['1 + 0', '"a" + "b"', 'int("5")', '[1, 2][1]', '10 // 3', '"ab" * 2', 'len("abc")', '2 ** 3', 'max(1, 2)', 'abs(-4)', '7 % 2', 'str(5)'], true)
  ],

  // =========================================================================
  // 5. REACTION REFLEX
  // =========================================================================
  reaction: [
    { id: 're_t1_1', tier: 1, title: 'REFLEX: GREEN LIGHT', icon: 'zap',
      instruction: 'Tap the GREEN dot as fast as you can!', gridSize: 12, targetColor: 'green', decoyColor: 'red' },
    { id: 're_t2_1', tier: 2, title: 'REFLEX: CYAN DOT', icon: 'zap',
      instruction: 'Tap the CYAN dot!', gridSize: 16, targetColor: 'cyan', decoyColor: 'blue' },
    { id: 're_t3_1', tier: 3, title: 'REFLEX: YELLOW DOT', icon: 'zap',
      instruction: 'Tap the YELLOW dot among the purples!', gridSize: 16, targetColor: 'yellow', decoyColor: 'purple' },
    { id: 're_t4_1', tier: 4, title: 'REFLEX: HIDDEN DOT', icon: 'zap',
      instruction: 'Find the lone GREEN dot in the blues!', gridSize: 20, targetColor: 'green', decoyColor: 'blue' }
  ],

  // =========================================================================
  // 6. DON'T CLICK TRAP
  // =========================================================================
  dont_click: [
    { id: 'dc_t1_1', tier: 1, title: 'DANGER ZONE', icon: 'alert-triangle',
      instruction: 'DO NOT CLICK for 1.5 seconds! Resist for bonus points!', duration: 1500 },
    { id: 'dc_t2_1', tier: 2, title: 'RED BUTTON', icon: 'alert-triangle',
      instruction: 'Hands off! Wait it out for bonus points.', duration: 1600 },
    { id: 'dc_t3_1', tier: 3, title: 'HIGH-VOLTAGE TRAP', icon: 'alert-triangle',
      instruction: 'DO NOT TOUCH! Clicking costs points!', duration: 1800 },
    { id: 'dc_t4_1', tier: 4, title: 'THE TEMPTATION', icon: 'alert-triangle',
      instruction: 'Resist the button for 2 seconds!', duration: 2000 }
  ],

  // =========================================================================
  // 7. MEMORY FLASH
  // =========================================================================
  memory_flash: [
    mem('mf_t1_1', 1, 'MEMORY FLASH', ['print', 'input', 'len'], 'Which word was SECOND?',
      'input', ['print', 'len', 'type'], 1400),
    mem('mf_t1_2', 1, 'MEMORY FLASH', ['7', '2', '9'], 'Which number came FIRST?', '7', ['2', '9', '4'], 1400),
    mem('mf_t2_1', 2, 'MEMORY FLASH', ['SELECT', 'FROM', 'WHERE'], 'Which word was LAST?',
      'WHERE', ['FROM', 'SELECT', 'ORDER'], 1300),
    mem('mf_t2_2', 2, 'MEMORY FLASH', ['5', '1', '8', '3'], 'Which number was THIRD?', '8', ['5', '1', '3'], 1300),
    mem('mf_t3_1', 3, 'MEMORY FLASH', ['int', 'str', 'float', 'bool'], 'Which type was THIRD?',
      'float', ['int', 'str', 'bool'], 1200),
    mem('mf_t3_2', 3, 'MEMORY FLASH', ['for', 'while', 'if', 'def'], 'Which keyword was SECOND?',
      'while', ['for', 'if', 'def'], 1200),
    mem('mf_t4_1', 4, 'MEMORY FLASH', ['4', '9', '1', '6', '2'], 'Which number was FOURTH?',
      '6', ['9', '1', '2'], 1100),
    mem('mf_t4_2', 4, 'MEMORY FLASH', ['JOIN', 'GROUP', 'ORDER', 'LIMIT'], 'Which keyword was THIRD?',
      'ORDER', ['JOIN', 'GROUP', 'LIMIT'], 1100)
  ],

  /**
   * Adaptive random challenge picker with zero-repetition guarantee.
   * @param {number} elapsedSeconds - seconds elapsed in the current run
   * @param {number} currentDifficultyTier - 1 (Easy) .. 4 (Hardest)
   * @param {Set<string>|Array<string>} seenIds - IDs already served this run
   */
  getRandomChallenge(elapsedSeconds = 0, currentDifficultyTier = 1, seenIds = new Set(), opts = null) {
    const seenSet = seenIds instanceof Set ? seenIds : new Set(seenIds);

    const allWeights = [
      { type: 'quiz', weight: 22 },
      { type: 'code_sequence', weight: 18 },
      { type: 'spot_bug', weight: 13 },
      { type: 'imposter', weight: 9 },
      { type: 'type_in', weight: 8 },
      { type: 'arrange', weight: 8 },
      { type: 'group_four', weight: 8 },
      { type: 'case_file', weight: 6 },
      { type: 'memory_flash', weight: 4 },
      { type: 'reaction', weight: 2 },
      { type: 'dont_click', weight: 2 }
    ];
    // Boss rounds ask for only the meatier types
    const categoryWeights = (opts && Array.isArray(opts.types))
      ? allWeights.filter(w => opts.types.includes(w.type))
      : allWeights;

    const unseenIn = (type, tier) =>
      (this[type] || []).filter(item => !seenSet.has(item.id) && (tier === undefined || item.tier === tier));

    // Try the requested tier first, then the nearest tiers outward (e.g. 2 -> 1 -> 3 -> 4).
    const tierOrder = [1, 2, 3, 4]
      .sort((a, b) => Math.abs(a - currentDifficultyTier) - Math.abs(b - currentDifficultyTier) || a - b);

    let chosenType = null;
    let pool = [];

    for (const tier of tierOrder) {
      // Weighted pick among categories that still have unseen questions at this tier
      const live = categoryWeights.filter(w => unseenIn(w.type, tier).length > 0);
      if (live.length === 0) continue;

      let rand = Math.random() * live.reduce((sum, w) => sum + w.weight, 0);
      for (const w of live) {
        if (rand < w.weight) { chosenType = w.type; break; }
        rand -= w.weight;
      }
      chosenType = chosenType || live[0].type;
      pool = unseenIn(chosenType, tier);
      break;
    }

    // Whole bank exhausted: allow repeats rather than stalling the game
    if (!chosenType) {
      const types = categoryWeights.map(w => w.type);
      chosenType = types[Math.floor(Math.random() * types.length)];
      pool = (this[chosenType] || []).filter(item => item.tier === currentDifficultyTier);
      if (pool.length === 0) pool = this[chosenType];
    }

    const chosenItem = pool[Math.floor(Math.random() * pool.length)];
    const data = JSON.parse(JSON.stringify(chosenItem));

    // Shuffle answer positions so the correct option isn't always first
    if (chosenType === 'imposter') {
      shuffleInPlace(data.options);
    } else if (Array.isArray(data.options) && typeof data.correct === 'number') {
      const rightAnswer = data.options[data.correct];
      shuffleInPlace(data.options);
      data.correct = data.options.indexOf(rightAnswer);
    }

    return { type: chosenType, id: chosenItem.id, tier: chosenItem.tier, data };
  }
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

window.CHALLENGE_ENGINE = Object.freeze(CHALLENGES_DB);
