const REGEX_URL = /^https:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/

export function create_validator(rules = {}) {
  let result = {};
  return function validate(data = {}) {
    loop:
    for (let key in rules) {
      let validations = rules[key];
      if (!validations) continue;
      for (let validation of validations) {
        if (!validation.rule(data[key])) {
          result[key] = validation.message;
          continue loop;
        }
      }
    }

    return result;
  }
}

let is_required = () => (value) => !!value;
let is_numeric = () => (value) => !isNaN(value);
let is_url = () => (value) => REGEX_URL.test(value);
let is_not_empty_string = () => (value) => value != null && value.trim() != "";

export const NEW_RECIPE_RULES = {
  preview_url: [
    {
      rule: is_required(),
      message: "Preview url is required"
    },
    {
      rule: is_url(),
      message: "Preview url must be valid url"
    }
  ],
  name: [
    {
      rule: is_required(),
      message: "Recipe name is required"
    },
  ],
  prep_time: [
    {
      rule: is_required(),
      message: "Prep time is required"
    },
    {
      rule: is_numeric(),
      message: "Prep time must number"
    }
  ],
  instructions: [
    {
      rule: is_required(),
      message: "Instructions are required"
    },
    {
      rule: is_not_empty_string(),
      message: "Instructions should not be empty"
    }
  ],
  ingredients: [
    {
      rule: is_required(),
      message: "Ingredients are required"
    },
    {
      rule: is_not_empty_string(),
      message: "Ingredients should not be empty"
    }
  ],
  category_id: [
    {
      rule: is_required(),
      message: "Category is required"
    },
  ]
}
