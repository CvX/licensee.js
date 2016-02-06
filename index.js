module.exports = licensee

var licenseSatisfies = require('spdx-satisfies')
var readPackageTree = require('read-package-tree')
var semverMatches = require('semver').match
var tv4 = require('tv4')
var validSPDX = require('spdx-expression-validate')

var schema = require('./configuration-schema.json')

function licensee(configuration, path, callback) {
  var validation = tv4.validateMultiple(configuration, schema)
  if (!validation.valid) {
    callback(new Error('Invalid configuration')) }
  else if (!validSPDX(configuration.license)) {
    callback(new Error('Invalid license expression')) }
  else {
    readPackageTree(path, function(error, data) {
      if (error) {
        callback(error) }
      else {
        callback(null, findIssues(configuration, data, [ ])) } }) } }

function findIssues(configuration, data, issues) {
  var dependencies = data.children
  if (typeof dependencies === 'object') {
    return dependencies
      .reduce(
        function(issues, data) {
          if (!acceptablePackage(configuration, data)) {
            issues.push({
              name: data.package.name,
              license: data.package.license,
              version: data.package.version,
              parent: data.parent,
              path: data.path }) }
          return findIssues(configuration, data, issues) },
        issues) }
  else {
    return issues } }

function acceptablePackage(configuration, data) {
  var licenseExpression = configuration.license
  var whitelist = configuration.whitelist
  return (
    Object.keys(whitelist)
      .some(function(name) {
        return (
          ( data.name === name ) &&
          ( semverMatches(data.package.version, whitelist[name]) ) ) }) ||
    ( licenseExpression &&
      validSPDX(licenseExpression) &&
      data.package.license &&
      ( typeof data.package.license === 'string' ) &&
      validSPDX(data.package.license) &&
      licenseSatisfies(data.package.license, licenseExpression) ) ) }
