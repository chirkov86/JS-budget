const budgetController = (function() {

  const data = {
    allItems: {
      expense: [],
      income: []
    },
    totals: {
      expense: 0,
      income: 0
    },
    budget: function() {
      return this.totals.income - this.totals.expense;
    },
    percentage: function() {
      return this.totals.income !== 0 ? Math.round(this.totals.expense / this.totals.income * 100) + '%' : '';
    }
  };

  const Expense = function(id, description, value) {
    this.id = id;
    this.description = description;
    this.value = value;
    this.percentage = -1;
  };

  // Array function can not refer to this, need to use old style
  Expense.prototype.calcPercentage = function(totalIncome) {
    this.percentage = totalIncome > 0 ?
      Math.round(this.value / totalIncome * 100) + '%' :
      -1;
  };

  Expense.prototype.getPercentage = function() {
    return this.percentage;
  };

  const Income = function(id, description, value) {
    this.id = id;
    this.description = description;
    this.value = value;
  };
  const idGenerator = {
    i: 0,
    getId: function() {
      return this.i++;
    }
  };
  const calculateTotal = (type) => {
    let sum = 0;
    data.allItems[type].forEach((x) => {
      sum += x.value;
    });
    data.totals[type] = sum;
  }

  return {
    addItem: (type, description, value) => {
      let id = idGenerator.getId();
      let newItem = type === 'income' ?
        new Income(id, description, value) :
        new Expense(id, description, value);
      data.allItems[type].push(newItem);
      return newItem;
    },
    deleteItem: (type, id) => {
      let ids = data.allItems[type].map((item) => {
        return item.id;
      });
      let index = ids.indexOf(id);
      if (index !== -1) {
        data.allItems[type].splice(index, 1); // removes one item at index position
      }
    },
    calculatBudget: () => {
      calculateTotal('expense');
      calculateTotal('income');
    },
    getBudget: () => {
      return {
        totalInc: data.totals.income,
        totalExp: data.totals.expense,
        budget: data.budget(),
        percentage: data.percentage(),
      }
    },
    calculatePercentages: () => {
      data.allItems.expense.forEach((item) => {
        item.calcPercentage(data.totals.income);
      })
    },
    getPercentages: () => {
      let allPercentages;
      allPercentages = data.allItems.expense.map((item) => {
        return item.getPercentage();
      });
      return allPercentages;
    }
  }
})();

const UIController = (function() {

  const DOMStrings = {
    inputType: '.add__type',
    inputDescription: '.add__description',
    inputValue: '.add__value',
    inputAdd: '.add__btn',
    budgetValue: '.budget__value',
    budgetIncome: '.budget__income--value',
    budgetExpenses: '.budget__expenses--value',
    budgetPercentage: '.budget__expenses--percentage',
    itemPercentage: '.item__percentage'
  };

  return {
    DOMStrings,
    getInput: function() {
      return {
        type: document.querySelector(DOMStrings.inputType).value,
        description: document.querySelector(DOMStrings.inputDescription).value,
        value: parseFloat(document.querySelector(DOMStrings.inputValue).value),
      }
    },
    addListItem: (obj, type) => {
      let html = type === 'income' ?
        '<div class="item clearfix" id="income-%id%"><div class="item__description">%description%</div><div class="right clearfix"><div class="item__value">%value%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>' :
        '<div class="item clearfix" id="expense-%id%"><div class="item__description">%description%</div><div class="right clearfix"><div class="item__value">-%value%</div><div class="item__percentage"></div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>';

      let newHtml = html.replace('%id%', obj.id)
        .replace('%description%', obj.description)
        .replace('%value%', obj.value);

      let element = type === 'income' ?
        document.querySelector('.income__list') :
        document.querySelector('.expenses__list');

      element.insertAdjacentHTML('beforeend', newHtml);
    },
    deleteListItem: (selectorId) => {
      let element = document.getElementById(selectorId);
      element.parentNode.removeChild(element);
    },
    clearFields: () => {
      // returns a list, not an array
      let fields = document.querySelectorAll(DOMStrings.inputDescription + ', ' + DOMStrings.inputValue);
      // array from list
      let fieldsArr = Array.prototype.slice.call(fields);
      fieldsArr.forEach((obj) => {
        obj.value = '';
      });
      // set focus on input_description field
      fieldsArr[0].focus();
    },
    displayBudget: (budget) => {
      document.querySelector(DOMStrings.budgetValue).textContent = budget.budget >= 0 ? '+ ' + budget.budget : budget.budget;
      document.querySelector(DOMStrings.budgetIncome).textContent = '+ ' + budget.totalInc;
      document.querySelector(DOMStrings.budgetExpenses).textContent = '- ' + budget.totalExp;
      document.querySelector(DOMStrings.budgetPercentage).textContent = budget.percentage;
    },
    displayPercentages: (percentages) => {
      let fields = document.querySelectorAll(DOMStrings.itemPercentage);
      // fields is a list of nodes, not an array, so it has no forEach
      // let's write our own forEach()
      let nodeListForEach = function(list, callback) {
        for (let i = 0; i < list.length; i++) {
          callback(list[i], i);
        }
      };
      nodeListForEach(fields, (item, index) => {
        item.textContent = percentages[index] !== -1 ? percentages[index] : '--';
      });
    }
  }
})();

const controller = (function(budgetCtrl, UICtrl) {
  const setupEventListeners = () => {
    document.querySelector(UIController.DOMStrings.inputAdd).addEventListener('click', ctrlAddItem);
    document.addEventListener('keypress', (event) => {
      if (event.keyCode === 13 || event.which == 13) {
        ctrlAddItem();
      }
    });
    document.querySelector('.container').addEventListener('click', ctrlDeleteItem);
  };
  const ctrlAddItem = () => {
    let newItem, input;
    input = UIController.getInput();
    if (input.description !== '' && !isNaN(input.value) && input.value > 0) {
      newItem = budgetController.addItem(input.type, input.description, input.value);
      UIController.addListItem(newItem, input.type);
      UIController.clearFields();
      updateBudget();
      updatePercentages();
    } else {
      alert('invalid input');
    }
  };

  const ctrlDeleteItem = (event) => {
    const itemId = event.target.parentNode.parentNode.parentNode.id;
    if (itemId) {
      const splitId = itemId.split('-');
      const type = splitId[0];
      const id = parseInt(splitId[1]);
      console.log('selected ' + splitId);
      budgetController.deleteItem(type, id);
      UIController.deleteListItem(itemId);
      updateBudget();
      updatePercentages();
    }
  };

  const updateBudget = () => {
    budgetController.calculatBudget();
    let budget = budgetController.getBudget();
    UIController.displayBudget(budget);
  };

  const updatePercentages = () => {
    budgetController.calculatePercentages();
    var percentages = budgetController.getPercentages();
    UIController.displayPercentages(percentages);
  };

  return {
    init: () => {
      console.log('Application has started');
      UIController.displayBudget({
        totalInc: 0,
        totalExp: 0,
        budget: 0,
        percentage: '',
      });
      setupEventListeners();
    }
  }
})(budgetController, UIController);

controller.init();
