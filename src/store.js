import Vue from 'vue'
import Vuex from 'vuex'
import uuidv1 from 'uuid/v1'
import Network from 'rf-network'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    fileList: [],
    plots: {},
    loadingFiles: false,
    navDrawer: false,
    plotType: 'smith'
  },
  mutations: {
    addPlot (state, plot) {
      state.plots[plot.id] = {
        ...plot.data
      }
    },
    addToFileList (state, plotInfo) {
      state.fileList.push(plotInfo)
    },
    deletePlot (state, plotToDelete) {
      // remove from plot list
      // remove from plots (plot data)
      state.fileList = state.fileList.filter(
        plot => plot.id !== plotToDelete.id
      )
      delete state.plots[plotToDelete.id]
    },
    setPlotType (state, plotType) {
      this.state.plotType = plotType
    },
    setPlotVisibility (state, plotInfo) {
      const fileIndexToUpdate = state.fileList.findIndex(
        file => file.id === plotInfo.id
      )

      state.fileList[fileIndexToUpdate].sPlots[plotInfo.index].visible =
        plotInfo.value
    },
    startLoading (state) {
      state.loadingFiles = true
    },
    stopLoading (state) {
      state.loadingFiles = false
    },
    toggleNavDrawer (state, val) {
      if (val === null) {
        state.navDrawer = !state.navDrawer
      } else {
        state.navDrawer = val
      }
    },
    updatePlotName (state, plotData) {
      const plotIndex = state.fileList.findIndex(
        plot => plot.id === plotData.id
      )
      state.fileList[plotIndex].name = plotData.name
    }
  },
  actions: {
    loadFiles ({ commit }, fileList) {
      commit('startLoading')

      let readCount = 0

      for (let i = 0; i < fileList.length; i++) {
        // use file inside of closure to assure we read every file one by one
        ;(function (file) {
          const name = file.name
          const id = uuidv1()
          const reader = new FileReader()

          reader.onload = function (e) {
            const network = new Network(e.target.result, file.name)
            const plotData = {
              data: network.data,
              unit: network.freqUnit,
              z0: network.z0,
              n: network.nPorts
            }

            // fileList will also contains a list of S-parameters for the file
            // and a visibility for each
            const sPlots = []
            for (let i = 0; i < plotData.n; i++) {
              for (let j = 0; j < plotData.n; j++) {
                const label = `s${i + 1},${j + 1}`
                sPlots.push({
                  label,
                  indeces: [i, j],
                  visible: false
                })
              }
            }

            // commit plots first so that they're available for getters
            // that iterate of the fileList
            commit('addPlot', { id, data: plotData })
            commit('addToFileList', { id, name, sPlots })

            readCount++

            if (readCount === fileList.length) {
              // final file has read
              commit('stopLoading')
            }
          }

          reader.readAsText(file, 'UTF-8')
        })(fileList[i])
      }
    }
  },
  getters: {
    plotsByName: state => {
      return state.fileList.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
          return -1
        }

        if (a.name.toLowerCase() > b.name.toLowerCase()) {
          return 1
        }

        return 0
      })
    }
  }
})
