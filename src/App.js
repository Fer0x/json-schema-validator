import React from "react";
import MonacoEditor from "react-monaco-editor";
import ajv from "ajv";
import jsonpack from "jsonpack";

import "./App.css";

const options = {
  selectOnLineNumbers: true
};

class App extends React.Component {
  constructor(props) {
    super(props);

    const restoredState = this.restoreState();

    this.state = restoredState
      ? restoredState
      : {
          schema: "",
          data: ""
        };

    this.state.validationErrors = this.getValidationErrors(
      this.getSchema(this.state.schema),
      this.getData(this.state.data)
    );
  }

  saveState(schema, data) {
    if (!schema || !data) {
      return;
    }

    const packedSchema = window.btoa(jsonpack.pack(schema));
    const packedData = window.btoa(jsonpack.pack(data));

    if (packedSchema && packedData) {
      window.history.replaceState(
        undefined,
        undefined,
        `#0${packedSchema}|${packedData}`
      );
    }
  }

  restoreState() {
    const { hash } = window.location;

    if (hash[0] !== "#" || hash.length < 2) return null;

    const version = hash.slice(1, 2);
    const encoded = hash.slice(2).split("|");

    const encodedSchema = encoded[0];
    const encodedData = encoded[1];

    if (version === "0") {
      const schema = jsonpack.unpack(window.atob(encodedSchema));
      const data = jsonpack.unpack(window.atob(encodedData));

      return {
        schema: JSON.stringify(schema, null, 2),
        data: JSON.stringify(data, null, 2)
      };
    }

    return null;
  }

  getJSONStringAsObject(string) {
    let object;

    try {
      object = JSON.parse(string);
    } catch (e) {
      return null;
    }

    return object;
  }

  getSchema(schemaStr = this.state.schema) {
    return this.getJSONStringAsObject(schemaStr);
  }

  getData(dataStr = this.state.data) {
    return this.getJSONStringAsObject(dataStr);
  }

  setupEditorValidation(schemaStr = this.state.schema) {
    const schema = this.getSchema(schemaStr);

    if (schema) {
      this.dataMonaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: "http://myserver/foo-schema.json",
            fileMatch: ["inmemory://model/2"],
            schema: schema
          }
        ]
      });
    }
  }

  handleSchemaChange = nextSchema => {
    const schema = this.getSchema(nextSchema);
    const data = this.getData();

    this.setState({
      schema: nextSchema,
      validationErrors: this.getValidationErrors(schema, data)
    });

    this.saveState(schema, data);

    this.setupEditorValidation(nextSchema);
  };

  getValidationErrors(schema, data) {
    if (schema && data) {
      const $ajv = new ajv();

      let validate;

      try {
        validate = $ajv.compile(schema);
      } catch (e) {
        return [
          {
            schemaPath: "?",
            message: e.message
          }
        ];
      }

      const valid = validate(data);

      if (!valid) {
        return validate.errors.map(({ schemaPath, message }) => ({
          schemaPath,
          message
        }));
      }
    }

    return [];
  }

  handleDataChange = nextData => {
    const schema = this.getSchema();
    const data = this.getData(nextData);

    this.setState({
      data: nextData,
      validationErrors: this.getValidationErrors(schema, data)
    });

    this.saveState(schema, data);
  };

  dataEditorDidMount = (editor, monaco) => {
    this.dataMonaco = monaco;

    this.setupEditorValidation();
  };

  render() {
    return (
      <div className="App">
        <div className="App-column">
          <MonacoEditor
            width="100%"
            height="600"
            language="json"
            value={this.state.schema}
            options={options}
            onChange={this.handleSchemaChange}
          />
        </div>
        <div className="App-column">
          <MonacoEditor
            width="100%"
            height="200"
            language="json"
            value={this.state.data}
            options={options}
            onChange={this.handleDataChange}
            editorDidMount={this.dataEditorDidMount}
          />
          <div className="App-validation">
            {this.state.validationErrors.length ? (
              this.state.validationErrors.map((error, index) => (
                <div className="App-error" key={index}>
                  <h3>{error.schemaPath}</h3>
                  <p>{error.message}</p>
                </div>
              ))
            ) : (
              <div className="App-success">no errors</div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
