'use strict';
/* global browser, expect, element, by, EC */
/* eslint new-cap: 0 */ // --> OFF for Given, When, Then

/*
 * Created by marketionist on 13.11.2016
 */
// #############################################################################

// Use the external Chai As Promised to deal with resolving promises in
// expectations
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const protractor = require('protractor');
const censor = require('./utils/helpers.js').censor;
const errors = require('./utils/errors.js');

chai.use(chaiAsPromised);
const expect = chai.expect;
const EC = protractor.ExpectedConditions;
const defaultCustomTimeout = 5000;
const customTimeout = browser.params.customTimeout || defaultCustomTimeout;
const pageObjects = browser.params.pageObjects;
const timeToWaitMax = 300100; // Maximum time to wait for in 'I wait for (\d+) ms' step

module.exports = function () {
    /**
     * Waits for the element to be present and displayed on the page
     * @param {string} elementSelector
     */
    function waitForDisplayed(elementSelector) {
        browser.wait(EC.presenceOf(elementSelector), customTimeout,
            errors.PRESENT);
    }
    /**
     * Composes proper element locator for fuether actions
     * @param {string} page
     * @param {string} elem
     * @returns {object} elmnt
     */
    function composeLocator(page, elem) {
        const locator = pageObjects[page][elem];
        let elmnt;

        if (locator[0] + locator[1] === '//') {
            elmnt = element(by.xpath(locator));
        } else {
            elmnt = element(by.css(locator));
        }

        return elmnt;
    }

    // #### When steps #############################################################

    this.When(/^I go to URL "([^"]*)"$/, function (url, callback) {
        browser.get(url);
        callback();
    });

    this.When(/^I go to "([^"]*)"."([^"]*)"$/, function (page, elem, callback) {
        const url = pageObjects[page][elem];

        browser.get(url);
        callback();
    });

    this.When(/^I reload the page$/, function (callback) {
        browser.refresh();
        callback();
    });

    this.When(/^I click "([^"]*)"."([^"]*)"$/, function (page, elem, callback) {
        const elmnt = composeLocator(page, elem);

        waitForDisplayed(elmnt);
        browser.wait(EC.elementToBeClickable(elmnt), customTimeout,
            `"${pageObjects[page][elem]}" ${errors.CLICKABLE}`);
        elmnt.click();
        callback();
    });

    this.When(/^I wait and click "([^"]*)"."([^"]*)"$/, function (page, elem, callback) {
        const elmnt = composeLocator(page, elem);
        const timeToWait = 300;

        waitForDisplayed(elmnt);
        browser.wait(EC.elementToBeClickable(elmnt), customTimeout,
            `"${pageObjects[page][elem]}" ${errors.CLICKABLE}`);
        setTimeout(function () {
            elmnt.click();
            callback();
        }, timeToWait);
    });

    this.When(/^I click "([^"]*)"."([^"]*)" if present$/, function (page, elem, callback) {
        const elmnt = composeLocator(page, elem);

        elmnt.isPresent().then(function (isPresent) {
            if (isPresent) {
                // Click only if element is present
                elmnt.click();
            }
            callback();
        });
    });

    this.When(/^I wait for (\d+) ms$/, { timeout: timeToWaitMax }, function (timeToWait, callback) {
        setTimeout(callback, timeToWait);
    });

    this.When(/^I wait for "([^"]*)"."([^"]*)" to be present$/, function (page, elem, callback) {
        const elmnt = composeLocator(page, elem);

        waitForDisplayed(elmnt);
        elmnt.isPresent().then(function (isPresent) {
            if (isPresent) {
                callback();
            } else {
                throw new Error(errors.PRESENT);
            }
        });
    });

    this.When(/^I type "([^"]*)" in the "([^"]*)"."([^"]*)"$/, function (
            text, page, elem, callback) {
        const inputField = composeLocator(page, elem);

        waitForDisplayed(inputField);
        browser.wait(EC.elementToBeClickable(inputField), customTimeout,
            `${pageObjects[page][elem]} ${errors.CLICKABLE}`);
        browser.actions().mouseMove(inputField).click().perform();
        inputField.sendKeys(text);
        callback();
    });

    this.When(/^I type "([^"]*)"."([^"]*)" in the "([^"]*)"."([^"]*)"$/, function (
            page1, element1, page2, element2, callback) {
        const inputField = composeLocator(page2, element2);

        waitForDisplayed(inputField);
        browser.wait(EC.elementToBeClickable(inputField), customTimeout,
            `${pageObjects[page2][element2]} ${errors.CLICKABLE}`);
        browser.actions().mouseMove(inputField).click().perform();
        inputField.sendKeys(pageObjects[page1][element1]);
        callback();
    });

    // #### Then steps #############################################################

    this.Then(/the title should be "([^"]*)"$/, function (text, callback) {
        expect(browser.getTitle()).to.eventually.equal(text).and.notify(callback);
    });

    this.Then(/^"([^"]*)"."([^"]*)" should be present$/, function (page, elem, callback) {
        const elmnt = composeLocator(page, elem);

        expect(elmnt.isPresent()).to.eventually.equal(true).and.notify(callback);
    });

    this.Then(/^"([^"]*)"."([^"]*)" should not be present$/, function (page, elem, callback) {
        const elmnt = composeLocator(page, elem);

        expect(elmnt.isPresent()).to.eventually.equal(false).and.notify(callback);
    });

    this.Then(/^"([^"]*)"."([^"]*)" text should be "([^"]*)"$/, function (page, elem, text, callback) {
        const elmnt = composeLocator(page, elem);

        expect(elmnt.getText()).to.eventually.equal(text).and.notify(callback);
    });

    this.Then(/^"([^"]*)"."([^"]*)" text should be "([^"]*)"."([^"]*)"$/, function (
            page1, element1, page2, element2, callback) {
        const elmnt = composeLocator(page1, element1);
        const text = pageObjects[page2][element2];

        expect(elmnt.getText()).to.eventually.equal(text).and.notify(callback);
    });

    this.Then(/^"([^"]*)"."([^"]*)" text should contain "([^"]*)"$/, function (page, elem, textPart, callback) {
        const elmnt = composeLocator(page, elem);

        elmnt.getText().then(function (text) {
            if (text.indexOf(textPart) === -1) {
                throw new Error(`${text} ${errors.CONTAIN} ${textPart}`);
            } else {
                callback();
            }
        });
    });

    this.Then(/^"([^"]*)"."([^"]*)" text should contain "([^"]*)"."([^"]*)"$/, function (
            page1, element1, page2, element2, callback) {
        const elmnt = composeLocator(page1, element1);
        const textPart = pageObjects[page2][element2];

        elmnt.getText().then(function (text) {
            if (text.indexOf(textPart) === -1) {
                throw new Error(`${text} ${errors.CONTAIN} ${textPart}`);
            } else {
                callback();
            }
        });
    });

    this.Then(/^URL should be "([^"]*)"$/, function (url, callback) {
        expect(browser.getCurrentUrl()).to.eventually.equal(url).and.notify(callback);
    });

    this.Then(/^URL should match \/([^"]*)\/$/, function (regexp, callback) {
        browser.getCurrentUrl().then(function (url) {
            if (new RegExp(regexp).test(url)) {
                callback();
            } else {
                throw new Error(`${url} ${errors.REGEXP} ${regexp}`);
            }
        });
    });

    this.Then(/^URL should contain "([^"]*)"$/, function (urlPart, callback) {
        browser.getCurrentUrl().then(function (url) {
            if (url.indexOf(urlPart) === -1) {
                throw new Error(`${url} ${errors.CONTAIN} ${urlPart}`);
            } else {
                callback();
            }
        });
    });

    // Take a callback as an additional argument to execute when the step is done
    this.Then(/^the file "([^"]*)" is empty$/, function (fileName, callback) {
        fs.readFile(fileName, 'utf8', function (error, contents) {
            if (error) {
                callback(error);
            } else {
                expect(contents).to.eventually.equal('').and.notify(callback);
            }
        });
    });

};
