/**
 * @file Jai grammar for tree-sitter
 * @author Dan Vail
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'jai',

  extras: $ => [
    /\s/,
    $.comment_line,
    $.comment_block,
    $.comment_markdown_block
  ],

  conflicts: $ => [
    [$.struct_declaration, $.enum_declaration],
    [$.function_call, $.member_access],
    [$.declaration, $.assignment],
    [$.type_expression, $.identifier],
    [$._expression, $.composite_literal],
    [$.parameter_declaration, $.declaration],
    [$.directive_expression, $.type_expression],
    [$.directive_expression, $.procedure_type],
    [$.declaration, $._expression],
    [$.type_expression, $._expression],
    [$.directive_statement, $._expression],
    [$.function_declaration, $._expression],
    [$.directive_expression, $.range_expression],
    [$.parameter_declaration, $._expression],
    [$.cast_expression, $.range_expression],
    [$.pointer_type],
    [$._statement, $.if_statement],
    [$._statement, $.while_statement],
    [$._statement, $.for_statement],
    [$._statement, $.defer_statement],
    [$.for_statement, $.array_access, $.unary_expression],
    [$.for_statement, $.member_access, $.unary_expression],
    [$.for_statement, $.binary_expression],
    [$.type_expression, $.parameter_declaration, $._expression],
    [$.type_expression, $.function_declaration],
    [$.type_expression, $.struct_declaration],
    [$.type_expression, $.enum_declaration],
    [$.function_declaration],
    [$.procedure_type],
    [$.procedure_type, $.function_declaration],
    [$.directive_expression, $.function_declaration],
    [$.directive_expression, $.procedure_type, $.function_declaration],
    [$.type_expression, $.return_type],
    [$.return_type_list],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $.import_statement,
      $.load_statement,
      $.foreign_library_statement,
      $.asm_block,
      $.function_declaration,
      $.struct_declaration,
      $.enum_declaration,
      $.declaration,
      $.assignment,
      $.if_statement,
      $.while_statement,
      $.for_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.defer_statement,
      $.remove_statement,
      $.using_statement,
      $.block,
      $.expression_statement,
      $.directive_statement,
      ';'
    ),

    // Comments
    comment_line: $ => token(seq('//', /.*/)),

    comment_block: $ => seq(
      '/*',
      repeat(choice(
        /[^*]/,
        /\*[^/]/
      )),
      '*/'
    ),

    comment_markdown_block: $ => seq(
      '/**',
      repeat(choice(
        /[^*]/,
        /\*[^/]/
      )),
      '*/'
    ),

    // Import/Load statements
    import_statement: $ => seq(
      optional(seq(field('namespace', $.identifier), '::')),
      choice('#import', '#import,file', '#import,dir', '#import,string'),
      field('path', $.string_literal)
    ),

    load_statement: $ => seq(
      '#load',
      field('path', $.string_literal)
    ),

    foreign_library_statement: $ => seq(
      field('name', $.identifier),
      '::',
      choice('#foreign_library', '#foreign_system_library'),
      field('path', $.string_literal)
    ),

    // Inline assembly
    asm_block: $ => seq(
      '#asm',
      optional(seq(
        field('features', $.identifier),
        optional(repeat(seq(',', $.identifier)))
      )),
      '{',
      repeat(choice(
        /[^}]/,
        seq('===', /[^}]/)
      )),
      '}'
    ),

    // Strings
    string_literal: $ => choice(
      $.string_quoted,
      $.string_here
    ),

    string_quoted: $ => seq(
      '"',
      repeat(choice(
        token.immediate(prec(1, /[^"\\%]+/)),
        $.escape_sequence,
        $.string_placeholder
      )),
      '"'
    ),

    escape_sequence: $ => token.immediate(seq('\\', /./)),

    string_placeholder: $ => choice(
      token.immediate(/%\d+/),
      token.immediate(/%/),
    ),

    string_here: $ => seq(
      '#string',
      field('delimiter', choice(
        $.identifier,
        seq($.identifier, /[a-zA-Z]+/)
      )),
      field('content', repeat(/[^\n]+/)),
      field('end_delimiter', $.identifier)
    ),

    // Directives
    directive_statement: $ => choice(
      $.scope_directive,
      $.directive_expression
    ),

    scope_directive: $ => choice(
      '#scope_export',
      '#scope_file',
      '#scope_module'
    ),

    directive_expression: $ => choice(
      seq('#run', $._expression),
      seq('#assert', $._expression),
      seq('#if', $._expression),
      seq('#ifx', $._expression),
      '#compiler',
      '#intrinsic',
      '#runtime_support',
      prec.right(seq('#deprecated', optional($.string_literal))),
      prec.right(seq('#foreign', $.identifier, optional($.string_literal))),
      '#c_call',
      '#no_context',
      '#symmetric',
      '#must',
      '#expand',
      seq('#bake', $.identifier, $.argument_list),
      seq('#bake_arguments', $.identifier, $.argument_list),
      seq('#bake_constants', $.identifier, $.argument_list),
      '#add_context',
      '#align',
      '#as',
      '#bytes',
      '#caller_code',
      '#caller_location',
      '#code',
      '#code,null',
      '#code,typed',
      '#compile_time',
      '#complete',
      '#dump',
      '#elsewhere',
      '#file',
      '#filepath',
      seq('#insert', optional(',scope')),
      '#modify',
      '#module_parameters',
      '#no_abc',
      '#no_alias',
      '#no_padding',
      '#no_reset',
      '#place',
      '#placeholder',
      '#procedure_name',
      '#procedure_of_call',
      '#program_export',
      '#specified',
      '#this',
      '#through',
      seq('#type', optional(choice(',isa', ',distinct'))),
      '#type_info_none',
      '#type_info_procedures_are_void_pointers',
      '#type_info_no_size_complaint',
      '#unshared',
      'inline',
      '#char'
    ),

    // Annotations
    annotation: $ => prec.right(seq(
      '@',
      field('name', $.identifier),
      optional(choice(
        $.string_literal,
        seq('(', optional(field('args', commaSep1($._expression))), ')')
      ))
    )),

    // Types
    type_expression: $ => choice(
      $.identifier,
      $.pointer_type,
      $.array_type,
      $.procedure_type,
      'struct',
      'enum',
      'enum_flags',
      'union',
      seq('#type', optional(choice(',isa', ',distinct'))),
      $.primitive_type
    ),

    primitive_type: $ => choice(
      'int', 'u8', 'u16', 'u32', 'u64',
      's8', 's16', 's32', 's64',
      'float', 'float32', 'float64',
      'bool', 'string', 'void',
      'Code', 'Type'
    ),

    pointer_type: $ => prec.right(seq(
      repeat1('*'),
      field('pointee', $.type_expression)
    )),

    array_type: $ => seq(
      '[',
      optional(field('size', $._expression)),
      ']',
      field('element', $.type_expression)
    ),

    procedure_type: $ => seq(
      optional(choice('inline', 'no_inline')),
      '(',
      optional(field('parameters', $.parameter_list)),
      ')',
      optional(seq('->', field('return_type', $.return_type_list))),
      repeat(choice('#c_call', '#no_context', '#symmetric'))
    ),

    // Struct declaration
    struct_declaration: $ => seq(
      field('name', $.identifier),
      '::',
      'struct',
      optional(seq('(', optional($.parameter_list), ')')),
      field('body', $.struct_body)
    ),

    struct_body: $ => seq(
      '{',
      repeat(choice(
        $.struct_member,
        $.using_statement,
        $.annotation,
        ';'
      )),
      '}'
    ),

    struct_member: $ => seq(
      optional('#align'),
      field('name', commaSep1($.identifier)),
      ':',
      optional(field('type', $.type_expression)),
      optional(seq('=', field('default', $._expression))),
      optional($.annotation),
      ';'
    ),

    // Enum declaration
    enum_declaration: $ => seq(
      field('name', $.identifier),
      '::',
      choice('enum', 'enum_flags'),
      optional(field('base_type', $.type_expression)),
      field('body', $.enum_body)
    ),

    enum_body: $ => seq(
      '{',
      repeat(choice(
        $.enum_member,
        ';'
      )),
      '}'
    ),

    enum_member: $ => prec.right(seq(
      field('name', $.identifier),
      optional(seq('=', field('value', $._expression))),
      optional(';')
    )),

    // Function declaration
    function_declaration: $ => seq(
      optional(repeat($.annotation)),
      field('name', choice(
        $.identifier,
        'main',
        'for_expansion',
        seq('operator', field('op', choice(
          '+', '-', '*', '/', '%',
          '==', '!=', '<', '>', '<=', '>=',
          '&', '|', '^', '<<', '>>',
          '&&', '||', '!',
          '[]', '[]=',
          '~'
        )))
      )),
      '::',
      choice(
        seq(
          optional(choice('inline', 'no_inline')),
          '(',
          optional(field('parameters', $.parameter_list)),
          ')',
          optional(seq('->', field('return_type', $.return_type_list))),
          repeat(choice(
            $.directive_expression,
            '#c_call',
            '#no_context',
            '#symmetric'
          )),
          optional(';')
        ),
        seq(
          '#type',
          optional(choice('inline', 'no_inline')),
          '(',
          optional(field('parameters', $.parameter_list)),
          ')',
          optional(seq('->', field('return_type', $.return_type_list))),
          repeat($.directive_expression),
          optional(';')
        ),
        seq(
          choice('#bake', '#bake_arguments', '#bake_constants'),
          $.identifier,
          $.argument_list
        )
      ),
      optional(field('body', $.block))
    ),

    parameter_list: $ => commaSep1($.parameter_declaration),

    parameter_declaration: $ => seq(
      optional('using'),
      optional(seq('$', field('polymorphic', $.identifier))),
      field('name', $.identifier),
      optional(seq(
        choice(':', ':='),
        optional('..'),
        optional(field('type', $.type_expression)),
        optional(seq('=', field('default', $._expression)))
      ))
    ),

    return_type_list: $ => commaSep1($.return_type),

    return_type: $ => choice(
      prec.right(seq(
        field('name', $.identifier),
        ':',
        field('type', $.type_expression),
        optional('#must')
      )),
      prec.right(seq(
        field('type', $.type_expression),
        optional('#must')
      ))
    ),

    // Variable declaration
    declaration: $ => prec.right(seq(
      field('names', commaSep1(choice($.identifier, 'it', 'it_index'))),
      choice(':', '::'),
      optional(field('type', $.type_expression)),
      optional(seq(choice(':', '='), field('value', $._expression))),
      optional(';')
    )),

    assignment: $ => prec.right(seq(
      field('left', commaSep1($._expression)),
      field('operator', choice(
        '=', '+=', '-=', '*=', '/=', '%=',
        '&=', '|=', '^=', '<<=', '>>='
      )),
      field('right', commaSep1($._expression)),
      optional(';')
    )),

    // Statements
    block: $ => seq(
      '{',
      repeat($._statement),
      '}'
    ),

    if_statement: $ => prec.right(seq(
      choice('if', 'ifx'),
      field('condition', $._expression),
      optional('then'),
      field('consequence', choice(prec(1, $.block), $._statement)),
      optional(seq('else', field('alternative', choice($.if_statement, prec(1, $.block), $._statement))))
    )),

    while_statement: $ => seq(
      'while',
      field('condition', $._expression),
      field('body', choice(prec(1, $.block), $._statement))
    ),

    for_statement: $ => seq(
      'for',
      optional(choice('*', '<', '* <', '< *')),
      optional(seq(
        field('iterator', commaSep1(choice($.identifier, 'it', 'it_index'))),
        ':'
      )),
      field('range', $._expression),
      field('body', choice(prec(1, $.block), $._statement))
    ),

    return_statement: $ => prec.right(seq(
      'return',
      optional(field('values', commaSep1($._expression))),
      optional(';')
    )),

    break_statement: $ => prec.right(seq('break', optional($.identifier), optional(';'))),

    continue_statement: $ => prec.right(seq('continue', optional($.identifier), optional(';'))),

    defer_statement: $ => seq(
      'defer',
      field('statement', choice(
        prec(1, $.block),
        $._statement
      ))
    ),

    remove_statement: $ => prec.right(seq(
      'remove',
      field('expression', $._expression),
      optional(';')
    )),

    using_statement: $ => prec.right(seq(
      'using',
      optional(choice(
        ',map',
        ',except',
        ',only'
      )),
      field('expression', $._expression),
      optional(';')
    )),

    expression_statement: $ => prec.right(seq(
      $._expression,
      optional(';')
    )),

    // Case statement
    case_statement: $ => seq(
      'case',
      optional(field('value', $._expression)),
      ';',
      field('body', repeat($._statement))
    ),

    // Expressions
    _expression: $ => choice(
      $.identifier,
      $.number_literal,
      $.string_literal,
      $.boolean_literal,
      $.null_literal,
      $.function_call,
      $.member_access,
      $.array_access,
      $.cast_expression,
      $.unary_expression,
      $.binary_expression,
      $.parenthesized_expression,
      $.composite_literal,
      $.array_literal,
      $.range_expression,
      $.directive_expression,
      $.annotation,
      'it',
      'it_index',
      'context',
      'temp'
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    function_call: $ => prec(21, seq(
      field('function', choice(
        $.identifier,
        $.member_access,
        seq($.identifier, '.', $.identifier)
      )),
      field('arguments', $.argument_list)
    )),

    argument_list: $ => seq(
      '(',
      optional(commaSep1($.argument)),
      ')'
    ),

    argument: $ => choice(
      $._expression,
      seq(field('name', $.identifier), '=', field('value', $._expression))
    ),

    member_access: $ => prec.left(20, seq(
      field('object', $._expression),
      '.',
      field('member', $.identifier)
    )),

    array_access: $ => prec.left(20, seq(
      field('array', $._expression),
      '[',
      field('index', $._expression),
      ']'
    )),

    cast_expression: $ => choice(
      seq(
        choice('cast', 'cast,trunc', 'cast,no_check', 'cast,trunc,no_check'),
        '(',
        field('type', $.type_expression),
        ')',
        field('value', $._expression)
      ),
      seq(
        'xx',
        field('value', $._expression)
      )
    ),

    unary_expression: $ => prec.left(15, seq(
      field('operator', choice(
        '-', '!', '~', '*', '&',
        '<<', 'cast'
      )),
      field('operand', $._expression)
    )),

    binary_expression: $ => {
      const table = [
        [prec.left, 14, choice('*', '/', '%')],
        [prec.left, 13, choice('+', '-')],
        [prec.left, 12, choice('<<', '>>')],
        [prec.left, 11, '&'],
        [prec.left, 10, '^'],
        [prec.left, 9, '|'],
        [prec.left, 8, choice('==', '!=', '<', '>', '<=', '>=')],
        [prec.left, 7, '&&'],
        [prec.left, 6, '||'],
      ];

      return choice(...table.map(([fn, priority, operator]) =>
        fn(priority, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression)
        ))
      ));
    },

    composite_literal: $ => seq(
      optional(field('type', $.identifier)),
      '.',
      choice(
        seq('{', optional(commaSep1($.composite_element)), '}'),
        seq('[', optional(commaSep1($._expression)), ']')
      )
    ),

    composite_element: $ => choice(
      seq(field('name', $.identifier), '=', field('value', $._expression)),
      seq('.', field('member', $.identifier), '=', field('value', $._expression)),
      $._expression
    ),

    array_literal: $ => seq(
      optional(field('type', $.type_expression)),
      '.[',
      optional(commaSep1($._expression)),
      ']'
    ),

    range_expression: $ => prec.left(seq(
      field('start', $._expression),
      '..',
      field('end', $._expression)
    )),

    // Literals
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number_literal: $ => token(choice(
      // Binary
      /0b[01_]+/,
      // Hexadecimal
      /0x[0-9a-fA-F_]+/,
      // Decimal with optional float
      /\d[\d_]*\.?\d*([eE][+-]?\d+)?/
    )),

    boolean_literal: $ => choice('true', 'false'),

    null_literal: $ => 'null',
  }
});

// Helper function for comma-separated lists
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}
