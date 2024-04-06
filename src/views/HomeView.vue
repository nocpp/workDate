<template>
  <div class="main-app-container">
    <van-nav-bar title="排班日历" />
    <div class="work-loop-setting">
      <van-cell @click="dataModalShow = true" title="排班设置" is-link>
        <template #value>
          <van-tag class="tag-item" v-for="item in radioOptions" :key="item.value"
            :type="item.value === +todayWorkType.loopValue ? 'primary' : 'default'">{{ item.text }}</van-tag>
        </template>
      </van-cell>
    </div>
    <div class="calendar-container" v-if="!isLoading">
      <vue-hash-calendar :disabled-week-view="true" picker-type="date">
        <template v-slot:day="scope">
          <div @click="setDebounce(scope?.date)" class="lunar-content" :class="{'release-day': showDateTip(scope?.date).indexOf('休') !== -1}">
            <div>{{ scope?.date.day }}</div>
            <div class="lunar-txt">{{ showDateTip(scope?.date) }}</div>
            <div v-if="isShowDebouceDay(scope?.date)" class="debounce-tips" flex="main:center cross:center">弹</div>
          </div>
        </template>
      </vue-hash-calendar>
    </div>
    <van-skeleton title :row="3" v-else/>

    <van-dialog v-model:show="dataModalShow" title="数据设置" :show-cancel-button="false">
      <van-form ref="formRef">
        <van-cell-group inset>
          <van-field v-model="loopDataValue" name="loopDataValue" label="排班顺序" placeholder="早、中、夜..."
            :rules="[{ required: true, message: '请填写排班顺序' }]" />
          <van-field :rules="[{ required: true, message: '请选择当天排班' }]" v-model="todayWorkType.loopValue" is-link readonly name="picker" label="今天班次" placeholder="选择今天是什么班？"
            @click="showPicker = true" />
        </van-cell-group>
      </van-form>
      <template #footer>
        <van-button @click="changeData" block type="primary">确定</van-button>
      </template>
    </van-dialog>

    <van-popup v-model:show="showPicker" position="bottom">
      <van-picker :columns="radioOptions" @confirm="onConfirm" @cancel="showPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { showDialog } from 'vant'

const loopDataValue = ref()
const dataModalShow = ref(false)
const todayWorkType = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  loopValue: undefined
})
const showPicker = ref(false)
const formRef = ref()
const isLoading = ref(true)
const debounceWorkDays = ref({})

const radioOptions = computed(() => {
  if (loopDataValue.value) {
    return loopDataValue.value.split('、').map((item, index) => ({ text: item, value: index + 1 }))
  } else {
    return []
  }
})

const setDebounce = (date) => {
  const theDayObj = dayjs(new Date(date.year, date.month, date.day))
  const theDate = theDayObj.format('YYYY-MM-DD')
  const isDebouceDay = debounceWorkDays.value[theDate]

  showDialog({
    title: '提示',
    message: !isDebouceDay ? `是否设置${theDate}为弹班？` : `是否取消设置${theDate}为弹班？`
  }).then(() => {
    if (isDebouceDay) {
      debounceWorkDays.value[theDate] = undefined
    } else {
      debounceWorkDays.value[theDate] = true
    }

    try {
      localStorage.setItem('debounceWorkDays', JSON.stringify(debounceWorkDays.value))
    } catch (error) { }
  })
}

const changeData = async () => {
  try {
    formRef.value.submit()
    await formRef.value.validate()

    localStorage.setItem('workLoopData', loopDataValue.value)
    localStorage.setItem('workNowData', JSON.stringify({
      date: dayjs().format('YYYY-MM-DD'),
      loopValue: todayWorkType.loopValue
    }))
    dataModalShow.value = false

    isLoading.value = true
    setTimeout(() => {
      isLoading.value = false
    }, 800)
  } catch (error) {
    console.log('errlog: ', error)
  }
}

const onConfirm = (val) => {
  todayWorkType.loopValue = val.selectedValues[0]
  showPicker.value = false
}

const isShowDebouceDay = (date) => {
  if (date) {
    const theDayObj = dayjs(new Date(date.year, date.month, date.day))
    const theDate = theDayObj.format('YYYY-MM-DD')

    return debounceWorkDays.value[theDate]
  } else {
    return ''
  }
}

const showDateTip = (date) => {
  const workLoopData = localStorage.getItem('workLoopData')
  let label = ''
  if (todayWorkType.loopValue && workLoopData) {
    const loopList = workLoopData.split('、')

    const theDayObj = dayjs(new Date(date.year, date.month, date.day))
    const theDate = theDayObj.format('YYYY-MM-DD')

    const theIndex = calcLoopIndexByDate(todayWorkType.date, theDate, todayWorkType.loopValue)
    label = loopList[theIndex - 1] || ''

    if (label === '休' && theDayObj.day() === 5) {
      label = '早*'
    }
  }

  return label
}

const calcLoopIndexByDate = (oldDate, newDate, oldIndex) => {
  const workLoopData = localStorage.getItem('workLoopData')
  let dayDiffNum = dayjs(newDate).diff(dayjs(oldDate), 'day')
  const loopLen = workLoopData.split('、').length

  dayDiffNum = dayDiffNum % loopLen // +、-、0

  oldIndex = Number(oldIndex)
  if (dayDiffNum > 0) {
    return (oldIndex + dayDiffNum) % loopLen
  } else if (dayDiffNum < 0) {
    const tempIndex = dayDiffNum + oldIndex

    if (tempIndex > 0) {
      return tempIndex
    } else if (tempIndex < 0) {
      return tempIndex + loopLen
    } else {
      return loopLen
    }
  } else {
    return oldIndex
  }
}

onMounted(() => {
  const workLoopData = localStorage.getItem('workLoopData')
  let workNowData = localStorage.getItem('workNowData')
  let debounceWorkDaysFromStorage = localStorage.getItem('debounceWorkDays')
  isLoading.value = true

  if (workLoopData && workNowData) {
    try {
      workNowData = JSON.parse(workNowData)
      loopDataValue.value = workLoopData

      const nowDate = dayjs().format('YYYY-MM-DD')

      todayWorkType.date = nowDate
      todayWorkType.loopValue = calcLoopIndexByDate(workNowData.date, nowDate, workNowData.loopValue)

      localStorage.setItem('workNowData', JSON.stringify({
        date: todayWorkType.date,
        loopValue: todayWorkType.loopValue
      }))

      if (debounceWorkDaysFromStorage) {
        debounceWorkDaysFromStorage = JSON.parse(debounceWorkDaysFromStorage)
        debounceWorkDays.value = debounceWorkDaysFromStorage || {}
      }
    } catch (error) { console.log('qxdlog: ', error) } finally {
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
})

// watch(radioOptions, (newVal, oldVal) => {
//   if (newVal.length !== oldVal.length) {
//     todayWorkType.loopValue = undefined
//   }
// })
</script>

<style lang="less" scoped>
.main-app-container {
  max-width: 500px;
  margin: 0 auto;
  .work-loop-setting {
    border-bottom: 1px solid #eee;
  }

  :deep(.van-cell__value) {
    text-align: left;
  }

  .tag-item {
    margin-right: 5px;
  }

  .calendar-container {
    :deep(.calendar_item) {
      padding: 6px 0;

      .calendar_day {
        border-radius: 3px;
      }

      .calendar_first_today {
        color: inherit;
      }

      .lunar-content {
        width: 100%;
        position: relative;
        font-size: 14px;
        text-align: center;

        .debounce-tips {
          position: absolute;
          right: -10px;
          top: -2px;
          font-size: 12px;
          color: #fff;
          background-color: rgb(245, 38, 38);
          border-radius: 50%;
          width: 16px;
          height: 16px;
        }
      }

      .release-day {
        border: 1px solid #9f76f6;
        border-radius: 6px;
      }

      .lunar-txt {
        font-size: 12px;
        text-align: center;
      }
    }
  }
}
</style>