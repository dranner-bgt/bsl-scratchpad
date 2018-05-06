import React, { Component } from 'react';
import update from 'immutability-helper';
import './App.css';

//import brace from 'brace';
import AceEditor from 'react-ace';

import 'brace/mode/json'
import 'brace/theme/github'

const initialState = {
  stepList: [1, 2],
  steps: {
    "1": {
      call: '/api/v2/additem',
      body: `{
  "betType": 13000,
  "eventId": 10,
  "gameId": 20,
  "resultIds": [[30]],
  "odd": 3.5
}`,
      result: null
    },
    "2": {
      call: '/api/v2/setstake',
      body: `{
  "itemId": 1,
  "overallStake": 100
}`,
      result: null
    }
  },
  betslip: { state: '', clientState: 'blargh' },
  idle: true
}

const Call = (currentState, method, body) => {
  return fetch('/bsl/' + method, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body:
      JSON.stringify(Object.assign({}, JSON.parse(body), { state: currentState }))
  })
    .then(x => {
      if (x.status === 200) return x;
      throw new Error("request failed with status " + x.status)
    })
    .then(x => x.json())

}

const updateStepData = (key, method, body) => (prevState) => ({ idle: false, steps: update(prevState.steps, { [key]: { $merge: { call: method, body } } }) })
const updateStepResult = (key, result) => (prevState) => ({ idle: true, steps: update(prevState.steps, { [key]: { $merge: { result } } }) })

class StepEditor extends Component {
  constructor(props) {
    super(props)
    this.state = {
      call: props.step.call,
      body: props.step.body
    }
  }

  handleClick() {
    this.props.update(this.state.call, this.state.body)
  }

  render() {
    return (
      <div style={{ marginBottom: '15px' }}>
        <div>Call</div>
        <input type="text" value={this.state.call} onChange={e => this.setState({ call: e.target.value })} />
        <div>Body</div>
        <AceEditor
          mode="json"
          theme="github"
          name="blah2"
          width="600px"
          onLoad={this.onLoad}
          onChange={x => this.setState({ body: x })}
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          value={this.state.body}
          setOptions={{
            showLineNumbers: true,
            tabSize: 2,
            //minLines: 10,
            maxLines: 10
          }}
          editorProps={{
            $blockScrolling: Infinity
          }}
        />
        <button disabled={!this.props.isEnabled} onClick={e => this.handleClick()}>Update</button>
        <div style={{ display: 'inline', fontSize: '8pt', marginLeft: '10px' }}>
          {this.props.step.result && this.props.step.result.state}
        </div>
        {this.props.step.result && (
          <div style={{ marginTop: '5px' }}>
            <div style={{ display: 'inline' }}>Result</div>
            <button style={{ display: 'inline', marginLeft: '10px' }}
              onClick={e => this.setState(prev => ({ isResultExpanded: !prev.isResultExpanded }))}>
              {this.state.isResultExpanded ? '-' : '+'}
            </button>
            {this.state.isResultExpanded && (
              <AceEditor mode="json" theme="github" readOnly={true} value={JSON.stringify(this.props.step.result, null, 2)}
                width="600px"
                setOptions={{
                  showLineNumbers: false,
                  tabSize: 2,
                  //minLines: 10,
                  maxLines: 30
                }}
                editorProps={{
                  $blockScrolling: Infinity
                }} />
            )}
          </div>
        )}
      </div>)
  }
}

class App extends Component {
  constructor() {
    super()
    this.state = initialState
  }

  call(method, body) {
    this.setState({ idle: false })
    Call(this.state.betslip.state, method, body)
      .then(json => this.setState({ idle: true, betslip: json }))
      .catch(ex => {
        console.log(ex)
        this.setState({ idle: true })
      })
  }

  updateStep(key, method, body) {
    this.setState(prevState => {
      const stepIndex = prevState.stepList.indexOf(key)
      const previousBetslipState = stepIndex > 0 &&
        prevState.steps[prevState.stepList[stepIndex - 1]].result &&
        prevState.steps[prevState.stepList[stepIndex - 1]].result.state
      Call(
        previousBetslipState || '',
        method, body)
        .then(json => this.setState(updateStepResult(key, json)))
      return updateStepData(key, method, body)(prevState)
    })
  }

  addStep() {
    this.setState(prevState => {
      const nextIndex = prevState.stepList.reduce((acc,x) => acc > x ? acc : x, 0) + 1
      return {
        stepList: update(prevState.stepList, { $push: [nextIndex] }),
        steps: update(prevState.steps, {
          $merge: {
            [nextIndex]: {
              call: '/api/v2/',
              body: '{}',
            }
          }
        })
      }
    })
  }

  render() {
    return (
      <div className="App" style={{ fontFamily: 'Helvetica' }}>
        <header className="App-header" style={{ backgroundColor: '#222', height: '30px', padding: '20px', color: 'white' }}>
          <div style={{ fontSize: '20pt' }}>BetslipService Scratchpad</div>
        </header>
        <div style={{ margin: '10px' }}>
          <div>
            <div style={{ display: 'inline' }}>Current state: </div>
            <div style={{ display: 'inline', fontSize: '8pt' }}>{this.state.betslip.state}</div>
          </div>
          {this.state.stepList.map(key => (
            <StepEditor
              key={key}
              isEnabled={this.state.idle}
              update={(method, body) => this.updateStep(key, method, body)}
              step={this.state.steps[key]} />)
          )}
          <button onClick={e => this.addStep()}>Add Step</button>
        </div>

      </div>
    );
  }
}

export default App;
