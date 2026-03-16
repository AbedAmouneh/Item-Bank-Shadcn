const DEFAULT_PROPS = [
  'display',
  'alignItems',
  'justifyContent',
  'justifyItems',
  'justifySelf',
  'flexWrap',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'gap',
  'rowGap',
  'columnGap',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'gridTemplate',
  'gridTemplateColumns',
  'gridTemplateRows',
  'gridColumn',
  'gridRow',
  'overflow',
  'overflowX',
  'overflowY',
  'textAlign',
];

function getPropertyName(keyNode) {
  if (!keyNode) return null;
  if (keyNode.type === 'Identifier') return keyNode.name;
  if (keyNode.type === 'Literal' && typeof keyNode.value === 'string') return keyNode.value;
  return null;
}

function unwrapExpression(expression) {
  if (!expression) return expression;
  if (expression.type === 'TSAsExpression' || expression.type === 'TSTypeAssertion') {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

function getReturnedObjectExpression(blockStatement) {
  for (const statement of blockStatement.body) {
    if (statement.type === 'ReturnStatement' && statement.argument?.type === 'ObjectExpression') {
      return statement.argument;
    }
  }
  return null;
}

function getSxObjectExpression(expression) {
  const unwrapped = unwrapExpression(expression);

  if (!unwrapped) return null;
  if (unwrapped.type === 'ObjectExpression') return unwrapped;

  if (unwrapped.type === 'ArrowFunctionExpression' || unwrapped.type === 'FunctionExpression') {
    const body = unwrapExpression(unwrapped.body);
    if (!body) return null;
    if (body.type === 'ObjectExpression') return body;
    if (body.type === 'BlockStatement') return getReturnedObjectExpression(body);
  }

  return null;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow layout/spacing props in sx; use Tailwind className instead.',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          props: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          allow: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      moveToClassName:
        "Move '{{prop}}' from sx to className (Tailwind). Keep sx for theme-driven styles only.",
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const disallowedProps = new Set(options.props ?? DEFAULT_PROPS);
    const allowedProps = new Set(options.allow ?? []);

    return {
      JSXAttribute(node) {
        if (node.name?.type !== 'JSXIdentifier' || node.name.name !== 'sx') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const objectExpression = getSxObjectExpression(node.value.expression);
        if (!objectExpression) return;

        for (const property of objectExpression.properties) {
          if (property.type !== 'Property') continue;
          if (property.computed) continue;

          const propName = getPropertyName(property.key);
          if (!propName) continue;
          if (!disallowedProps.has(propName)) continue;
          if (allowedProps.has(propName)) continue;

          context.report({
            node: property.key,
            messageId: 'moveToClassName',
            data: { prop: propName },
          });
        }
      },
    };
  },
};
